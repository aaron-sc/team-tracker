/** Single-use authorization codes live for 60 seconds — just long enough for the client's
 *  redirect + token exchange, short enough that a leaked code (browser history, a referrer
 *  header, a proxy log) is worthless almost immediately. */
export const AUTH_CODE_TTL_MS = 60_000;

/** Access tokens (used only against /oauth/userinfo) are short-lived by design — there are no
 *  refresh tokens in v1, so a client re-authenticates via a fresh /oauth/authorize round trip
 *  once its own session expires rather than silently minting new access tokens forever. */
export const ACCESS_TOKEN_TTL_SECONDS = 10 * 60;

export const SUPPORTED_SCOPES = ["openid", "profile", "email"] as const;
export type OAuthScope = (typeof SUPPORTED_SCOPES)[number];
