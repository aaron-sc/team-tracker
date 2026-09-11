import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { validateAuthorizeParams } from "@/lib/oauth/validate";
import { hasExistingGrant, issueAuthorizationCode } from "@/lib/oauth/service";
import { getBaseUrl } from "@/lib/utils/base-url";

/**
 * The OIDC authorization endpoint — the front door of Formation-as-identity-provider. A client
 * (the hub, Vault) sends the user's browser here; we either bounce back with a code (session +
 * consent already in place), send them to /login first, or send them to the consent screen.
 */
export async function GET(request: NextRequest) {
  const result = await validateAuthorizeParams(request.nextUrl.searchParams);
  if (!result.ok) {
    if (!result.redirectable) {
      return NextResponse.json({ error: "invalid_request", error_description: "Unknown client_id or redirect_uri." }, { status: 400 });
    }
    const url = new URL(result.redirectUri);
    url.searchParams.set("error", result.error);
    if (result.state) url.searchParams.set("state", result.state);
    return NextResponse.redirect(url);
  }

  const { client, redirectUri, codeChallenge, scope, state, nonce } = result.request;

  const session = await auth();
  if (!session?.user) {
    // request.nextUrl.origin isn't reliable behind this VM's proxy (see lib/utils/base-url.ts) —
    // it can resolve to the app's internal address rather than the public domain, which would
    // send the browser to a Location header nothing outside the container can reach.
    const loginUrl = new URL("/login", await getBaseUrl());
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (await hasExistingGrant(session.user.id, client.id)) {
    const code = await issueAuthorizationCode({
      userId: session.user.id,
      clientDbId: client.id,
      redirectUri,
      codeChallenge,
      scope,
      nonce,
    });
    const url = new URL(redirectUri);
    url.searchParams.set("code", code);
    if (state) url.searchParams.set("state", state);
    return NextResponse.redirect(url);
  }

  // First time this user's been asked about this client — the consent screen re-validates
  // everything itself from this same query string rather than trusting this redirect.
  const consentUrl = new URL("/oauth/authorize/consent", await getBaseUrl());
  consentUrl.search = request.nextUrl.search;
  return NextResponse.redirect(consentUrl);
}
