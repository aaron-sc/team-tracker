import { NextRequest } from "next/server";
import { signIn } from "@/auth";
import { safeRedirectTo } from "@/lib/utils/safe-redirect";

/**
 * Always-redirect entry point for "I already have an esports-tools.com session, use it" — never
 * linked to from a bare hostname. This has to be a Route Handler, not a page: Auth.js's signIn()
 * writes the OIDC PKCE/state/nonce check cookies before redirecting, and Next.js only allows
 * cookie writes from a Server Action or a Route Handler — a plain page's server render can read
 * cookies but not set them (confirmed directly: calling signIn() from a page component throws
 * "Cookies can only be modified in a Server Action or Route Handler").
 *
 * It also isn't a Server Action bound to a form. This session hit a real, separately-diagnosed bug
 * where redirect() called *inside a Server Action* (invoked via a hydrated form's action prop) can
 * silently stall when the target is a Route Handler rather than a page — the framework's
 * "x-action-redirect: push" client-router protocol doesn't reliably follow through in that shape.
 * A GET Route Handler reached via a plain top-level navigation (the hub's own link, or a <Link> on
 * this app's own /login) never goes through that protocol at all — it's a normal top-level
 * request/response, so this resolves as a real HTTP redirect every time.
 */
export async function GET(request: NextRequest) {
  const redirectTo = safeRedirectTo(request.nextUrl.searchParams.get("redirectTo") ?? undefined) ?? "/orgs";
  const url = await signIn("esports-tools", { redirect: false, redirectTo });
  return Response.redirect(url);
}
