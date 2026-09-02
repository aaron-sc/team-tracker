"use server";

import { prisma } from "@/lib/db/prisma";
import { requireMembership } from "@/lib/auth/authorize";

/** Fire-and-forget: records that the current viewer has seen this announcement. No permission
 *  needed beyond being a member — any org member reading an announcement can mark it read. */
export async function markAnnouncementReadAction(orgId: string, announcementId: string): Promise<void> {
  const { membership } = await requireMembership(orgId);

  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!announcement || announcement.orgId !== orgId) return;

  await prisma.announcementRead.upsert({
    where: { announcementId_membershipId: { announcementId, membershipId: membership.membershipId } },
    create: { announcementId, membershipId: membership.membershipId },
    update: {},
  });
}
