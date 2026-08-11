"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireMembership, requirePermission } from "@/lib/auth/authorize";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

export async function markNotificationReadAction(orgId: string, notificationId: string): Promise<ActionState> {
  const { membership } = await requireMembership(orgId);

  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.membershipId !== membership.membershipId) return { error: "Not found." };

  await prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
}

export async function markAllNotificationsReadAction(orgId: string): Promise<ActionState> {
  const { membership } = await requireMembership(orgId);

  await prisma.notification.updateMany({
    where: { membershipId: membership.membershipId, isRead: false },
    data: { isRead: true },
  });
  return undefined;
}

export async function sendBroadcastNotificationAction(
  orgSlug: string,
  orgId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.notification_send_broadcast);

  const title = formData.get("title");
  const body = formData.get("body");
  const teamId = formData.get("teamId");
  if (typeof title !== "string" || title.trim().length < 2) {
    return { error: "Title must be at least 2 characters." };
  }

  const where =
    typeof teamId === "string" && teamId && teamId !== "all"
      ? { orgId, teamMemberships: { some: { teamId } } }
      : { orgId };

  const recipients = await prisma.membership.findMany({
    where: { ...where, id: { not: membership.membershipId } },
    select: { id: true },
  });

  await prisma.notification.createMany({
    data: recipients.map((r) => ({
      membershipId: r.id,
      type: "broadcast",
      title: title.trim(),
      body: typeof body === "string" && body.trim() ? body.trim() : undefined,
    })),
  });

  revalidatePath(`/${orgSlug}`, "layout");
  return { success: `Sent to ${recipients.length} member${recipients.length === 1 ? "" : "s"}.` };
}
