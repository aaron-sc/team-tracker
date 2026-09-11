import "server-only";
import crypto from "node:crypto";
import { generateSecret, generateURI, verify } from "otplib";
import { prisma } from "@/lib/db/prisma";

/**
 * TOTP secrets are encrypted at rest (AES-256-GCM, key derived from AUTH_SECRET) — unlike a
 * bcrypt password hash, a raw TOTP secret is fully reusable by anyone who reads it, so a DB leak
 * alone would otherwise be enough to defeat every account's 2FA at once. AUTH_SECRET never
 * leaving the server is the same trust boundary everything else here already depends on.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set — required for 2FA.");
  return crypto.createHash("sha256").update(secret).digest();
}

/** iv (12 bytes) + authTag (16 bytes) + ciphertext, all base64url-joined with "." */
export function encryptTotpSecret(secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString("base64url")).join(".");
}

export function decryptTotpSecret(encrypted: string): string {
  const [ivB64, tagB64, dataB64] = encrypted.split(".");
  const iv = Buffer.from(ivB64, "base64url");
  const authTag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function generateTotpSecret(): string {
  return generateSecret();
}

export function totpKeyUri(secret: string, email: string): string {
  return generateURI({ issuer: "Formation", label: email, secret });
}

export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  try {
    const result = await verify({ secret, token: code.trim() });
    return result.valid;
  } catch {
    return false;
  }
}

/** Human-typeable backup codes — grouped like "xxxxx-xxxxx" rather than one long random blob,
 *  since these are meant to be written down and entered by hand if the authenticator is lost. */
export function generateRecoveryCode(): string {
  const raw = crypto.randomBytes(5).toString("hex"); // 10 hex chars
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
}

export function hashRecoveryCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
}

/** The one place a raw code (from an authenticator app or a written-down recovery code) is
 *  checked against a specific user's 2FA — used both by the "totp" sign-in provider (auth.ts)
 *  and by account settings actions (disabling 2FA, regenerating recovery codes) that require
 *  re-proving the second factor before making a change. A matched recovery code is marked used
 *  here, so this has a side effect — call it at most once per submitted code. */
export async function verifySecondFactor(userId: string, rawCode: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { totpSecret: true } });
  if (!user?.totpSecret) return false;

  const trimmed = rawCode.trim();
  if (await verifyTotpCode(decryptTotpSecret(user.totpSecret), trimmed)) return true;

  const recoveryCode = await prisma.recoveryCode.findUnique({ where: { codeHash: hashRecoveryCode(trimmed) } });
  if (recoveryCode && recoveryCode.userId === userId && !recoveryCode.usedAt) {
    await prisma.recoveryCode.update({ where: { id: recoveryCode.id }, data: { usedAt: new Date() } });
    return true;
  }
  return false;
}
