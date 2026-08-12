"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/resend";
import { verifyEmailHtml } from "@/lib/email/templates";
import { getBaseUrl } from "@/lib/utils/base-url";
import type { ActionState } from "@/lib/actions/types";

const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

/** Shared by signup and the resend action — not itself an exported form action. */
export async function sendVerificationEmail(userId: string, email: string, name: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.emailVerificationToken.create({ data: { userId, token, expiresAt } });

  const baseUrl = await getBaseUrl();
  await sendEmail({
    to: email,
    subject: "Verify your email for Formation",
    html: verifyEmailHtml({ name, verifyUrl: `${baseUrl}/verify-email/${token}` }),
  });
}

export async function resendVerificationEmailAction(): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };
  if (session.user.hasVerifiedEmail) return { success: "Your email is already verified." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Account not found." };

  await sendVerificationEmail(user.id, user.email, user.name);
  return { success: `Verification email sent to ${user.email}.` };
}

export async function verifyEmailAction(token: string): Promise<ActionState> {
  const verificationToken = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!verificationToken || verificationToken.usedAt || verificationToken.expiresAt < new Date()) {
    return { error: "This verification link is no longer valid. Request a new one." };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: verificationToken.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: verificationToken.id }, data: { usedAt: new Date() } }),
  ]);

  redirect("/orgs");
}
