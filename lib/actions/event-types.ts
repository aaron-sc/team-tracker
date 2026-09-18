"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

export async function createEventTypeAction(orgSlug: string, orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.org_settings_manage);

  const name = formData.get("name");
  if (typeof name !== "string" || name.trim().length < 2) {
    return { error: "Name must be at least 2 characters." };
  }
  const trackAttendance = formData.get("trackAttendance") === "on";

  const existing = await prisma.eventType.findUnique({ where: { orgId_name: { orgId, name: name.trim() } } });
  if (existing) return { error: "An event type with that name already exists." };

  const eventType = await prisma.eventType.create({ data: { orgId, name: name.trim(), trackAttendance } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "event_type.created",
    targetType: "EventType",
    targetId: eventType.id,
    metadata: { name: eventType.name },
  });

  revalidatePath(`/${orgSlug}/settings/event-types`);
  return { success: "Event type added." };
}

export async function updateEventTypeAction(
  orgSlug: string,
  orgId: string,
  eventTypeId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.org_settings_manage);

  const eventType = await prisma.eventType.findUnique({ where: { id: eventTypeId } });
  if (!eventType || eventType.orgId !== orgId) return { error: "Event type not found." };

  const name = formData.get("name");
  if (typeof name !== "string" || name.trim().length < 2) {
    return { error: "Name must be at least 2 characters." };
  }
  const trackAttendance = formData.get("trackAttendance") === "on";

  const existing = await prisma.eventType.findUnique({ where: { orgId_name: { orgId, name: name.trim() } } });
  if (existing && existing.id !== eventTypeId) return { error: "An event type with that name already exists." };

  await prisma.eventType.update({ where: { id: eventTypeId }, data: { name: name.trim(), trackAttendance } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "event_type.updated",
    targetType: "EventType",
    targetId: eventTypeId,
    metadata: { name: name.trim() },
  });

  revalidatePath(`/${orgSlug}/settings/event-types`);
  return { success: "Event type updated." };
}

export async function deleteEventTypeAction(orgSlug: string, orgId: string, eventTypeId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.org_settings_manage);

  const eventType = await prisma.eventType.findUnique({ where: { id: eventTypeId } });
  if (!eventType || eventType.orgId !== orgId) return { error: "Event type not found." };

  await prisma.eventType.delete({ where: { id: eventTypeId } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "event_type.deleted",
    targetType: "EventType",
    targetId: eventTypeId,
    metadata: { name: eventType.name },
  });

  revalidatePath(`/${orgSlug}/settings/event-types`);
  return { success: "Event type deleted." };
}
