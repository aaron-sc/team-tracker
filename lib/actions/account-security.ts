"use server";

import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import {
  generateTotpSecret,
  encryptTotpSecret,
  totpKeyUri,
  generateRecoveryCode,
  hashRecoveryCode,
  verifySecondFactor,
} from "@/lib/auth/totp";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export type TotpEnrollState = { error?: string } | { secret: string; qrDataUri: string } | undefined;

/** Step 1 of enabling 2FA: generates and stores a secret, but leaves totpEnabledAt unset — the
 *  account isn't actually protected by it yet (login only checks totpEnabledAt), so an abandoned
 *  enrollment can't lock anyone out. Re-running this while already mid-enrollment just replaces
 *  the pending secret with a fresh one, which is fine — nothing depends on the old one yet. */
export async function startTotpEnrollAction(): Promise<TotpEnrollState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (user.totpEnabledAt) return { error: "Two-factor authentication is already enabled." };

  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: user.id }, data: { totpSecret: encryptTotpSecret(secret) } });

  const qrDataUri = await QRCode.toDataURL(totpKeyUri(secret, user.email));
  return { secret, qrDataUri };
}

export type ConfirmTotpState = { error?: string } | { recoveryCodes: string[] } | undefined;

/** Step 2: proves the authenticator app actually has the secret (not just that the QR was shown)
 *  before turning 2FA on, and hands back one-time-visible recovery codes. */
export async function confirmTotpEnrollAction(_prev: ConfirmTotpState, formData: FormData): Promise<ConfirmTotpState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Enter the 6-digit code from your authenticator app." };

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.totpSecret) return { error: "Start enrollment first." };
  if (user.totpEnabledAt) return { error: "Two-factor authentication is already enabled." };

  const valid = await verifySecondFactor(user.id, code);
  if (!valid) return { error: "Incorrect code — try again." };

  const recoveryCodes = Array.from({ length: 10 }, () => generateRecoveryCode());
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { totpEnabledAt: new Date() } }),
    prisma.recoveryCode.deleteMany({ where: { userId: user.id } }),
    ...recoveryCodes.map((c) => prisma.recoveryCode.create({ data: { userId: user.id, codeHash: hashRecoveryCode(c) } })),
  ]);

  // No revalidatePath here on purpose — the dialog still has one more thing to show (the
  // recovery codes, exactly once) before the account page's "2FA is on" state needs to be
  // reflected. Revalidating now would re-render the page mid-dialog and reset that local state
  // out from under the user. TwoFactorDialog does a full reload once they close it instead.
  return { recoveryCodes };
}

export type SecurityActionState = { error?: string; success?: string } | undefined;

/** Requires a fresh code — not just an existing session — so someone who grabs an unlocked
 *  browser can't turn off 2FA on their way out. */
export async function disableTotpAction(_prev: SecurityActionState, formData: FormData): Promise<SecurityActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const allowed = await checkRateLimit("2fa_verify", 10, 5 * 60 * 1000);
  if (!allowed) return { error: "Too many attempts. Try again in a few minutes." };

  const code = String(formData.get("code") ?? "").trim();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.totpEnabledAt) return { error: "Two-factor authentication isn't enabled." };

  const valid = await verifySecondFactor(user.id, code);
  if (!valid) return { error: "Incorrect code." };

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { totpSecret: null, totpEnabledAt: null } }),
    prisma.recoveryCode.deleteMany({ where: { userId: user.id } }),
  ]);

  revalidatePath("/account");
  return { success: "Two-factor authentication is now off." };
}

export type RecoveryCodesState = { error?: string } | { recoveryCodes: string[] } | undefined;

export async function regenerateRecoveryCodesAction(
  _prev: RecoveryCodesState,
  formData: FormData,
): Promise<RecoveryCodesState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const allowed = await checkRateLimit("2fa_verify", 10, 5 * 60 * 1000);
  if (!allowed) return { error: "Too many attempts. Try again in a few minutes." };

  const code = String(formData.get("code") ?? "").trim();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.totpEnabledAt) return { error: "Two-factor authentication isn't enabled." };

  const valid = await verifySecondFactor(user.id, code);
  if (!valid) return { error: "Incorrect code." };

  const recoveryCodes = Array.from({ length: 10 }, () => generateRecoveryCode());
  await prisma.$transaction([
    prisma.recoveryCode.deleteMany({ where: { userId: user.id } }),
    ...recoveryCodes.map((c) => prisma.recoveryCode.create({ data: { userId: user.id, codeHash: hashRecoveryCode(c) } })),
  ]);

  // No revalidatePath here either, same reasoning as confirmTotpEnrollAction — the dialog still
  // needs to show these codes once before anything re-renders around it. Nothing on the account
  // page's own render depends on which specific codes exist, so skipping the revalidate here
  // costs nothing.
  return { recoveryCodes };
}

/** Invalidates every session token issued before now (see auth.ts's jwt callback) and signs this
 *  browser out immediately too, so the feedback is instant rather than "eventually, on this
 *  device too". */
export async function signOutEverywhereAction(): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  await prisma.user.update({ where: { id: session.user.id }, data: { sessionsValidFrom: new Date() } });
  await signOut({ redirectTo: "/login" });
}

export async function revokeOAuthGrantAction(clientDbId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  await prisma.oAuthGrant.deleteMany({ where: { userId: session.user.id, clientId: clientDbId } });
  revalidatePath("/account");
}
