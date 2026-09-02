"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { gearItemSchema } from "@/lib/validations/gear";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

// The dialog's "Nobody" / "No team" Select options use the sentinel "none" — Radix Select
// disallows an actual empty-string value — so that has to be treated as unset here, same as
// every other sentinel-select in this codebase.
function orNone(value: FormDataEntryValue | null): string {
  const s = String(value ?? "");
  return s === "none" ? "" : s;
}

function parseGearForm(formData: FormData) {
  return gearItemSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") ?? "",
    serialNumber: formData.get("serialNumber") ?? "",
    status: formData.get("status"),
    assignedToMembershipId: orNone(formData.get("assignedToMembershipId")),
    assignedToTeamId: orNone(formData.get("assignedToTeamId")),
    notes: formData.get("notes") ?? "",
  });
}

export async function createGearItemAction(orgSlug: string, orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.gear_manage);
  const parsed = parseGearForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await prisma.gearItem.create({
    data: {
      orgId,
      name: parsed.data.name,
      category: parsed.data.category || null,
      serialNumber: parsed.data.serialNumber || null,
      status: parsed.data.status,
      assignedToMembershipId: parsed.data.assignedToMembershipId || null,
      assignedToTeamId: parsed.data.assignedToTeamId || null,
      notes: parsed.data.notes || null,
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "gear.created",
    targetType: "GearItem",
    targetId: orgId,
    metadata: { name: parsed.data.name },
  });

  revalidatePath(`/${orgSlug}/gear`);
  return { success: "Added." };
}

export async function updateGearItemAction(
  orgSlug: string,
  orgId: string,
  gearItemId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.gear_manage);
  const item = await prisma.gearItem.findUnique({ where: { id: gearItemId } });
  if (!item || item.orgId !== orgId) return { error: "Not found." };

  const parsed = parseGearForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await prisma.gearItem.update({
    where: { id: gearItemId },
    data: {
      name: parsed.data.name,
      category: parsed.data.category || null,
      serialNumber: parsed.data.serialNumber || null,
      status: parsed.data.status,
      assignedToMembershipId: parsed.data.assignedToMembershipId || null,
      assignedToTeamId: parsed.data.assignedToTeamId || null,
      notes: parsed.data.notes || null,
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "gear.updated",
    targetType: "GearItem",
    targetId: gearItemId,
    metadata: { name: parsed.data.name },
  });

  revalidatePath(`/${orgSlug}/gear`);
  return { success: "Updated." };
}

export async function deleteGearItemAction(orgSlug: string, orgId: string, gearItemId: string): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.gear_manage);
  const item = await prisma.gearItem.findUnique({ where: { id: gearItemId } });
  if (!item || item.orgId !== orgId) return { error: "Not found." };

  await prisma.gearItem.delete({ where: { id: gearItemId } });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "gear.deleted",
    targetType: "GearItem",
    targetId: gearItemId,
    metadata: { name: item.name },
  });

  revalidatePath(`/${orgSlug}/gear`);
  return { success: "Removed." };
}
