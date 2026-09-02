"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getOrgContext } from "@/lib/org/context";

function generateToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/** Lazily creates (or rotates) the caller's own personal calendar subscription token — no
 *  elevated permission required, since it only ever exposes that one member's own schedule. */
export async function getOrCreateCalendarTokenAction(orgSlug: string): Promise<{ token: string }> {
  const { membership } = await getOrgContext(orgSlug);

  const existing = await prisma.membership.findUnique({
    where: { id: membership.membershipId },
    select: { calendarToken: true },
  });
  if (existing?.calendarToken) return { token: existing.calendarToken };

  const token = generateToken();
  await prisma.membership.update({ where: { id: membership.membershipId }, data: { calendarToken: token } });
  revalidatePath(`/${orgSlug}/schedule`);
  return { token };
}

export async function rotateCalendarTokenAction(orgSlug: string): Promise<{ token: string }> {
  const { membership } = await getOrgContext(orgSlug);

  const token = generateToken();
  await prisma.membership.update({ where: { id: membership.membershipId }, data: { calendarToken: token } });
  revalidatePath(`/${orgSlug}/schedule`);
  return { token };
}
