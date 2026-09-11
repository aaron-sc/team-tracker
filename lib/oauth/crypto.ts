import "server-only";
import crypto from "node:crypto";

/**
 * All of Formation's other secret-storage code (see lib/actions/api-key.ts,
 * lib/access-requests/service.ts) either stores a value in plaintext or HMACs a payload — nothing
 * hashes a high-entropy bearer secret at rest. OAuth client secrets and authorization codes are
 * exactly that: not a user-chosen password (where a slow hash like bcrypt defends against
 * low-entropy guessing), but a 256-bit random value where a fast, collision-resistant hash is the
 * standard approach (the same one GitHub/Stripe use for API keys) — sha256 is plenty, and a slow
 * hash here would just make every /oauth/token request slower for no security benefit.
 */
export function hashSecret(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Constant-time comparison of two hex-encoded hashes — never use `===` on secret material. */
export function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** A random URL-safe token for client secrets and authorization codes. */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** PKCE (RFC 7636) S256 check: does `verifier`, once hashed, match the `challenge` presented at
 *  /oauth/authorize? Both sides are already base64url text, so this compares them as buffers via
 *  the same constant-time path as hashesMatch rather than a plain string `===`. */
export function verifyPkce(verifier: string, challenge: string): boolean {
  const computed = crypto.createHash("sha256").update(verifier).digest("base64url");
  const bufA = Buffer.from(computed);
  const bufB = Buffer.from(challenge);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
