import "server-only";
import { prisma } from "@/lib/db/prisma";
import { hashSecret, randomToken, verifyPkce } from "@/lib/oauth/crypto";
import { AUTH_CODE_TTL_MS } from "@/lib/oauth/constants";
import type { OAuthClient } from "@/lib/generated/prisma/client";

/** Has this user already approved this client? Scope is a fixed, all-or-nothing set in v1
 *  (`openid profile email` — see constants.ts), so "has a grant at all" is enough; a future scope
 *  system would need to compare the requested scope against what was actually granted. */
export async function hasExistingGrant(userId: string, clientDbId: string): Promise<boolean> {
  const grant = await prisma.oAuthGrant.findUnique({
    where: { userId_clientId: { userId, clientId: clientDbId } },
  });
  return !!grant;
}

export async function recordGrant(userId: string, clientDbId: string, scope: string): Promise<void> {
  await prisma.oAuthGrant.upsert({
    where: { userId_clientId: { userId, clientId: clientDbId } },
    create: { userId, clientId: clientDbId, scope },
    update: { scope },
  });
}

/** Mints a single-use authorization code and returns the raw value to embed in the redirect URL —
 *  only its sha256 hash is ever stored (see lib/oauth/crypto.ts). */
export async function issueAuthorizationCode(params: {
  userId: string;
  clientDbId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
  nonce: string | null;
}): Promise<string> {
  const code = randomToken();
  await prisma.oAuthAuthCode.create({
    data: {
      codeHash: hashSecret(code),
      clientId: params.clientDbId,
      userId: params.userId,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      scope: params.scope,
      nonce: params.nonce,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
    },
  });
  return code;
}

export type ConsumeCodeResult =
  | { ok: true; userId: string; scope: string; nonce: string | null }
  | { ok: false; error: "invalid_grant" };

/** Redeems a code at /oauth/token: looks it up by hash, checks it belongs to this client and
 *  redirect_uri, hasn't expired, and that the PKCE verifier matches — then deletes it so it can
 *  never be redeemed twice, success or failure alike (an expired-but-still-present row is exactly
 *  as much a replay risk as a fresh one, so both paths remove it). */
export async function consumeAuthorizationCode(params: {
  code: string;
  client: OAuthClient;
  redirectUri: string;
  codeVerifier: string;
}): Promise<ConsumeCodeResult> {
  const record = await prisma.oAuthAuthCode.findUnique({ where: { codeHash: hashSecret(params.code) } });
  if (!record) return { ok: false, error: "invalid_grant" };

  // Always delete on first sight, whether or not the rest of validation passes — a code that
  // failed validation once must not be retryable.
  await prisma.oAuthAuthCode.delete({ where: { id: record.id } });

  if (record.clientId !== params.client.id) return { ok: false, error: "invalid_grant" };
  if (record.redirectUri !== params.redirectUri) return { ok: false, error: "invalid_grant" };
  if (record.expiresAt.getTime() < Date.now()) return { ok: false, error: "invalid_grant" };
  if (!verifyPkce(params.codeVerifier, record.codeChallenge)) return { ok: false, error: "invalid_grant" };

  return { ok: true, userId: record.userId, scope: record.scope, nonce: record.nonce };
}
