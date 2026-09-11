import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyAccessToken } from "@/lib/oauth/tokens";
import { getBaseUrl } from "@/lib/utils/base-url";

/**
 * Standard OIDC userinfo endpoint. Profile fields are re-read from the DB on every call rather
 * than trusted from the access token — a name or avatar changed after the token was issued should
 * show up immediately, not after the client's next full re-authorization.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }

  const issuer = await getBaseUrl();
  let sub: string;
  try {
    ({ sub } = await verifyAccessToken(token, issuer));
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }

  const user = await prisma.user.findUnique({
    where: { id: sub },
    select: { id: true, email: true, name: true, avatarUrl: true, emailVerifiedAt: true },
  });
  if (!user) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }

  return NextResponse.json({
    sub: user.id,
    email: user.email,
    email_verified: !!user.emailVerifiedAt,
    name: user.name,
    picture: user.avatarUrl,
  });
}
