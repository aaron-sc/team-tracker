import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/resend";
import { accessApprovedEmailHtml } from "@/lib/email/templates";

/**
 * Approve/deny logic for access requests, shared by the two entry points that can action one:
 * the Discord bot's buttons (lib/integrations/discord-bot.ts) and the signed fallback link
 * (app/api/access-requests/decide/route.ts). Both are idempotent — a second click just reports
 * the current state.
 */

/** HMAC over `<token>:<action>` with AUTH_SECRET — the only thing guarding the fallback link. */
export function signDecision(token: string, action: "approve" | "deny"): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return crypto.createHmac("sha256", secret).update(`${token}:${action}`).digest("hex");
}

export function verifyDecisionSig(token: string, action: string, sig: string): boolean {
  if (action !== "approve" && action !== "deny") return false;
  if (!token || !/^[0-9a-f]{64}$/.test(sig)) return false;
  const expected = signDecision(token, action);
  return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
}

type DecisionError = { ok: false; error: string };
export type ApproveResult =
  | { ok: true; status: "APPROVED"; alreadyDecided: boolean; email: string; name: string; signupUrl: string }
  | DecisionError;
export type DenyResult =
  | { ok: true; status: "DENIED"; alreadyDecided: boolean; email: string; name: string }
  | DecisionError;

/** `baseUrl` is the absolute origin for the signup link — from the request in the route handler,
 *  or getBackgroundBaseUrl() for the bot. May be "" if nothing is configured (local dev). */
export async function approveAccessRequest(
  token: string,
  reviewedBy: string,
  baseUrl: string,
): Promise<ApproveResult> {
  const req = await prisma.accessRequest.findUnique({ where: { token } });
  if (!req) return { ok: false, error: "That access request no longer exists." };

  const signupUrl = `${baseUrl.replace(/\/$/, "")}/signup?token=${req.token}`;

  if (req.status === "DENIED") return { ok: false, error: "This request was already denied." };
  if (req.status === "APPROVED") {
    return { ok: true, status: "APPROVED", alreadyDecided: true, email: req.email, name: req.name, signupUrl };
  }

  await prisma.accessRequest.update({
    where: { id: req.id },
    data: { status: "APPROVED", reviewedAt: new Date(), reviewedBy: reviewedBy.slice(0, 100) },
  });

  if (signupUrl.startsWith("http")) {
    await sendEmail({
      to: req.email,
      subject: "You're approved for Formation",
      html: accessApprovedEmailHtml({ name: req.name, signupUrl }),
    }).catch((err) => console.error("[access-request] approval email failed:", err));
  } else {
    console.warn(
      `[access-request] Approved ${req.email} but APP_URL isn't set — no email sent. Signup link: ${signupUrl}`,
    );
  }

  return { ok: true, status: "APPROVED", alreadyDecided: false, email: req.email, name: req.name, signupUrl };
}

export async function denyAccessRequest(token: string, reviewedBy: string): Promise<DenyResult> {
  const req = await prisma.accessRequest.findUnique({ where: { token } });
  if (!req) return { ok: false, error: "That access request no longer exists." };

  if (req.status === "APPROVED") return { ok: false, error: "This request was already approved." };
  if (req.status === "DENIED") {
    return { ok: true, status: "DENIED", alreadyDecided: true, email: req.email, name: req.name };
  }

  await prisma.accessRequest.update({
    where: { id: req.id },
    data: { status: "DENIED", reviewedAt: new Date(), reviewedBy: reviewedBy.slice(0, 100) },
  });
  return { ok: true, status: "DENIED", alreadyDecided: false, email: req.email, name: req.name };
}
