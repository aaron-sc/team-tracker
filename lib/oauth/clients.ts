import "server-only";
import { prisma } from "@/lib/db/prisma";
import { hashSecret, hashesMatch } from "@/lib/oauth/crypto";
import type { OAuthClient } from "@/lib/generated/prisma/client";

export async function findClient(clientId: string): Promise<OAuthClient | null> {
  return prisma.oAuthClient.findUnique({ where: { clientId } });
}

/** Every redirect_uri this client is allowed to send users back to — checked as an exact string
 *  match, never a prefix/pattern match, at both /oauth/authorize and /oauth/token. A prefix match
 *  ("starts with https://vault.esports-tools.com") would let an attacker register
 *  https://vault.esports-tools.com.evil.example or ride an open redirect elsewhere on the real
 *  client's own domain — exact match is the only safe option for something this security-critical. */
export function isAllowedRedirectUri(client: OAuthClient, redirectUri: string): boolean {
  const allowed = client.redirectUris;
  if (!Array.isArray(allowed)) return false;
  return allowed.some((uri) => typeof uri === "string" && uri === redirectUri);
}

export function verifyClientSecret(client: OAuthClient, secret: string): boolean {
  return hashesMatch(client.clientSecretHash, hashSecret(secret));
}
