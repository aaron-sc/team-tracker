"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { prospectLevelSchema } from "@/lib/validations/prospect";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

export async function createProspectLevelAction(
  orgSlug: string,
  orgId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.recruitment_manage);

  const parsed = prospectLevelSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await prisma.prospectLevel.findUnique({
    where: { orgId_name: { orgId, name: parsed.data.name } },
  });
  if (existing) {
    return { error: "A level with that name already exists." };
  }

  const maxOrder = await prisma.prospectLevel.aggregate({ where: { orgId }, _max: { order: true } });
  const level = await prisma.prospectLevel.create({
    data: { orgId, name: parsed.data.name, order: (maxOrder._max.order ?? -1) + 1 },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "prospect_level.created",
    targetType: "ProspectLevel",
    targetId: level.id,
    metadata: { name: level.name },
  });

  revalidatePath(`/${orgSlug}/recruitment`);
  return { success: `Added "${level.name}".` };
}

export async function renameProspectLevelAction(
  orgSlug: string,
  orgId: string,
  levelId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.recruitment_manage);

  const level = await prisma.prospectLevel.findUnique({ where: { id: levelId } });
  if (!level || level.orgId !== orgId) return { error: "Level not found." };

  const parsed = prospectLevelSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await prisma.prospectLevel.findUnique({
    where: { orgId_name: { orgId, name: parsed.data.name } },
  });
  if (existing && existing.id !== levelId) {
    return { error: "A level with that name already exists." };
  }

  await prisma.prospectLevel.update({ where: { id: levelId }, data: { name: parsed.data.name } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "prospect_level.renamed",
    targetType: "ProspectLevel",
    targetId: levelId,
    metadata: { from: level.name, to: parsed.data.name },
  });

  revalidatePath(`/${orgSlug}/recruitment`);
  return { success: "Renamed." };
}

export async function deleteProspectLevelAction(orgSlug: string, orgId: string, levelId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.recruitment_manage);

  const level = await prisma.prospectLevel.findUnique({ where: { id: levelId } });
  if (!level || level.orgId !== orgId) return { error: "Level not found." };

  // Prospects using this level fall back to "no level" (levelId's onDelete:
  // SetNull) — deletion is always allowed, including down to zero levels.
  await prisma.prospectLevel.delete({ where: { id: levelId } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "prospect_level.deleted",
    targetType: "ProspectLevel",
    targetId: levelId,
    metadata: { name: level.name },
  });

  revalidatePath(`/${orgSlug}/recruitment`);
}
