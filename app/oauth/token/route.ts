import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { findClient, verifyClientSecret } from "@/lib/oauth/clients";
import { consumeAuthorizationCode } from "@/lib/oauth/service";
import { signIdToken, signAccessToken } from "@/lib/oauth/tokens";
import { ACCESS_TOKEN_TTL_SECONDS } from "@/lib/oauth/constants";
import { getBaseUrl } from "@/lib/utils/base-url";
import { checkRateLimit } from "@/lib/utils/rate-limit";

/**
 * The OIDC token endpoint — the server-to-server half of the exchange. Never touched by the
 * user's browser: the client's own backend calls this directly with the code it just received at
 * /oauth/authorize, its client_secret (client_secret_post — see the field names below), and the
 * PKCE code_verifier that pairs with the code_challenge it sent originally.
 */
export async function POST(request: NextRequest) {
  const allowed = await checkRateLimit("oauth_token", 30, 5 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "invalid_request", error_description: "Too many requests." }, { status: 429 });
  }

  const form = await request.formData();
  const grantType = form.get("grant_type");
  const code = form.get("code");
  const redirectUri = form.get("redirect_uri");
  const clientId = form.get("client_id");
  const clientSecret = form.get("client_secret");
  const codeVerifier = form.get("code_verifier");

  if (grantType !== "authorization_code") {
    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
  }
  if (
    typeof code !== "string" ||
    typeof redirectUri !== "string" ||
    typeof clientId !== "string" ||
    typeof clientSecret !== "string" ||
    typeof codeVerifier !== "string"
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const client = await findClient(clientId);
  if (!client || !verifyClientSecret(client, clientSecret)) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }

  const consumed = await consumeAuthorizationCode({ code, client, redirectUri, codeVerifier });
  if (!consumed.ok) {
    return NextResponse.json({ error: consumed.error }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: consumed.userId },
    select: { id: true, email: true, name: true, avatarUrl: true, emailVerifiedAt: true },
  });
  if (!user) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }

  const issuer = await getBaseUrl();
  const claims = {
    sub: user.id,
    email: user.email,
    emailVerified: !!user.emailVerifiedAt,
    name: user.name,
    picture: user.avatarUrl,
  };

  const [idToken, accessToken] = await Promise.all([
    signIdToken({ issuer, audience: client.clientId, claims, nonce: consumed.nonce }),
    signAccessToken({ issuer, audience: client.clientId, sub: user.id, scope: consumed.scope }),
  ]);

  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      id_token: idToken,
      scope: consumed.scope,
    },
    { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } },
  );
}
