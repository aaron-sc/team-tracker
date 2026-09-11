import "server-only";
import crypto from "node:crypto";

const TTL_MS = 5 * 60 * 1000; // 5 minutes to enter a code once the password checks out

/**
 * A short-lived, signed "you already proved the password, now prove the second factor" token —
 * carries only a userId + expiry, HMAC-signed with AUTH_SECRET (same trust boundary as
 * lib/access-requests/service.ts's signed decision links). Deliberately never touches the
 * plaintext password again after the first step: the "totp" Auth.js provider (see auth.ts)
 * authorizes off of this token + a TOTP/recovery code, not off credentials.
 */
export function createPending2faToken(userId: string): string {
  const payload = JSON.stringify({ userId, exp: Date.now() + TTL_MS });
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyPending2faToken(token: string): { userId: string } | null {
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  if (sign(payloadB64) !== sig) return null;

  try {
    const { userId, exp } = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (typeof userId !== "string" || typeof exp !== "number" || exp < Date.now()) return null;
    return { userId };
  } catch {
    return null;
  }
}

function sign(payloadB64: string): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
}
