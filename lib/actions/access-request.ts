"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { accessRequestSchema } from "@/lib/validations/access-request";
import { notifyAccessRequest } from "@/lib/access-requests/notify";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { getBaseUrl } from "@/lib/utils/base-url";

export type RequestAccessState = { error?: string; submitted?: boolean } | undefined;

const GENERIC_SUBMITTED: RequestAccessState = { submitted: true };

/**
 * Public, unauthenticated. Records an access request and pings the operator's Discord. Always
 * reports the same "submitted" state whether or not a request already existed for that email —
 * no point telling a stranger whether an address is already in the queue.
 */
export async function requestAccessAction(
  _prev: RequestAccessState,
  formData: FormData,
): Promise<RequestAccessState> {
  // Honeypot — real visitors never see or fill "company" (hidden off-screen in the form).
  if (String(formData.get("company") ?? "").trim()) return GENERIC_SUBMITTED;

  const allowed = await checkRateLimit("access_request", 5, 60 * 60 * 1000);
  if (!allowed) return { error: "Too many requests from this network — try again later." };

  const parsed = accessRequestSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    orgName: formData.get("orgName"),
    websiteUrl: formData.get("websiteUrl") ?? "",
    discordInvite: formData.get("discordInvite") ?? "",
    games: formData.get("games"),
    rosterSize: formData.get("rosterSize") ?? "",
    reason: formData.get("reason"),
    referral: formData.get("referral") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }
  const data = parsed.data;

  // Someone who already has an account doesn't need to request access.
  const existingUser = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existingUser) {
    return { error: "There's already an account for that email — try logging in instead." };
  }

  const existingRequest = await prisma.accessRequest.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (existingRequest) return GENERIC_SUBMITTED; // don't reveal queue state

  const forwardedFor = (await headers()).get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || null;

  const created = await prisma.accessRequest.create({
    data: {
      email: data.email,
      name: data.name,
      role: data.role,
      orgName: data.orgName,
      websiteUrl: data.websiteUrl || null,
      discordInvite: data.discordInvite || null,
      games: data.games,
      rosterSize: data.rosterSize || null,
      reason: data.reason,
      referral: data.referral || null,
      ip,
      token: crypto.randomBytes(32).toString("base64url"),
    },
  });

  const baseUrl = await getBaseUrl().catch(() => null);
  await notifyAccessRequest(
    {
      token: created.token,
      name: created.name,
      email: created.email,
      role: created.role,
      orgName: created.orgName,
      websiteUrl: created.websiteUrl,
      discordInvite: created.discordInvite,
      games: created.games,
      rosterSize: created.rosterSize,
      reason: created.reason,
      referral: created.referral,
      ip: created.ip,
    },
    baseUrl,
  ).catch((err) => console.error("[access-request] notify failed:", err));

  return GENERIC_SUBMITTED;
}
