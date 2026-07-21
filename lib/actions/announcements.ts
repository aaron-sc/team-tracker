"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { announcementSchema } from "@/lib/validations/announcement";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

export async function createAnnouncementAction(orgSlug: string, orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.announcement_create);

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    teamId: formData.get("teamId") ?? "",
    pinned: formData.get("pinned") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const pinned = parsed.data.pinned && membership.permissions.includes(Permission.announcement_pin);

  await prisma.announcement.create({
    data: {
      orgId,
      teamId: parsed.data.teamId || null,
      authorId: membership.membershipId,
      title: parsed.data.title,
      body: parsed.data.body,
      pinned,
    },
  });

  revalidatePath(`/${orgSlug}/announcements`);
  revalidatePath(`/${orgSlug}/dashboard`);
  redirect(`/${orgSlug}/announcements`);
}

export async function deleteAnnouncementAction(orgSlug: string, orgId: string, announcementId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.announcement_delete);

  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!announcement || announcement.orgId !== orgId) return { error: "Not found." };

  await prisma.announcement.delete({ where: { id: announcementId } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "announcement.deleted",
    targetType: "Announcement",
    targetId: announcementId,
    metadata: { title: announcement.title },
  });

  revalidatePath(`/${orgSlug}/announcements`);
  revalidatePath(`/${orgSlug}/dashboard`);
}
