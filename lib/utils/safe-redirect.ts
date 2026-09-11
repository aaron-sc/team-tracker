/** Only ever a same-origin relative path — never "//host/..." (scheme-relative, an open-redirect
 *  vector) — so this is safe to feed straight into next/navigation's redirect() or a hidden form
 *  field. Shared by /login and /login/2fa, which both take a ?redirectTo= to land on after
 *  completing sign-in. */
export function safeRedirectTo(value: string | undefined): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}
