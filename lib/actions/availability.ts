"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireMembership } from "@/lib/auth/authorize";
import { availabilityRuleGroupSchema, availabilityExceptionSchema } from "@/lib/validations/availability";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";
import type { SessionMembership } from "@/lib/auth/types";

async function requireAvailabilityAccess(orgId: string, targetMembershipId: string): Promise<SessionMembership> {
  const { membership } = await requireMembership(orgId);
  const isSelf = membership.membershipId === targetMembershipId;

  if (isSelf && membership.permissions.includes(Permission.availability_manage_self)) return membership;
  if (membership.permissions.includes(Permission.availability_manage_others)) return membership;

  throw new Error("You don't have permission to manage this availability.");
}

/**
 * Creates (or replaces) a group of same-time rules across one or more days.
 * Pass `replaceRuleIds` (all must belong to targetMembershipId) to treat this
 * as an edit — those rows are deleted and the newly submitted days/time take
 * their place — otherwise it's a plain add.
 */
export async function saveAvailabilityRuleGroupAction(
  orgSlug: string,
  orgId: string,
  targetMembershipId: string,
  replaceRuleIds: string[],
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAvailabilityAccess(orgId, targetMembershipId);

  const parsed = availabilityRuleGroupSchema.safeParse({
    daysOfWeek: formData.getAll("daysOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (replaceRuleIds.length > 0) {
    const owned = await prisma.availabilityRule.count({
      where: { id: { in: replaceRuleIds }, membershipId: targetMembershipId },
    });
    if (owned !== replaceRuleIds.length) return { error: "Not found." };
  }

  await prisma.$transaction([
    ...(replaceRuleIds.length > 0
      ? [prisma.availabilityRule.deleteMany({ where: { id: { in: replaceRuleIds } } })]
      : []),
    prisma.availabilityRule.createMany({
      data: parsed.data.daysOfWeek.map((dayOfWeek) => ({
        membershipId: targetMembershipId,
        dayOfWeek,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        timezone: parsed.data.timezone,
      })),
    }),
  ]);

  revalidatePath(`/${orgSlug}/availability`);
  return { success: replaceRuleIds.length > 0 ? "Updated." : "Added." };
}

export async function deleteAvailabilityRuleGroupAction(
  orgSlug: string,
  orgId: string,
  targetMembershipId: string,
  ruleIds: string[],
): Promise<ActionState> {
  await requireAvailabilityAccess(orgId, targetMembershipId);

  const owned = await prisma.availabilityRule.count({
    where: { id: { in: ruleIds }, membershipId: targetMembershipId },
  });
  if (owned !== ruleIds.length) return { error: "Not found." };

  await prisma.availabilityRule.deleteMany({ where: { id: { in: ruleIds } } });
  revalidatePath(`/${orgSlug}/availability`);
}

export async function addAvailabilityExceptionAction(
  orgSlug: string,
  orgId: string,
  targetMembershipId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAvailabilityAccess(orgId, targetMembershipId);

  const parsed = availabilityExceptionSchema.safeParse({
    date: formData.get("date"),
    isAvailable: formData.get("isAvailable") === "on",
    startTime: formData.get("startTime") ?? "",
    endTime: formData.get("endTime") ?? "",
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await prisma.availabilityException.create({
    data: {
      membershipId: targetMembershipId,
      date: new Date(`${parsed.data.date}T00:00:00Z`),
      isAvailable: parsed.data.isAvailable,
      startTime: parsed.data.startTime || null,
      endTime: parsed.data.endTime || null,
      reason: parsed.data.reason || null,
    },
  });

  revalidatePath(`/${orgSlug}/availability`);
}

export async function deleteAvailabilityExceptionAction(
  orgSlug: string,
  orgId: string,
  targetMembershipId: string,
  exceptionId: string,
): Promise<ActionState> {
  await requireAvailabilityAccess(orgId, targetMembershipId);

  const exception = await prisma.availabilityException.findUnique({ where: { id: exceptionId } });
  if (!exception || exception.membershipId !== targetMembershipId) return { error: "Not found." };

  await prisma.availabilityException.delete({ where: { id: exceptionId } });
  revalidatePath(`/${orgSlug}/availability`);
}
