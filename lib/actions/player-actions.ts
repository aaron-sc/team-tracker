"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { playerActionSchema } from "@/lib/validations/player-action";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

export async function createPlayerActionAction(
  orgSlug: string,
  orgId: string,
  teamMembershipId: string,
  membershipId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.player_actions_manage);

  const teamMembership = await prisma.teamMembership.findUnique({
    where: { id: teamMembershipId },
    include: { membership: { include: { user: true } }, team: true },
  });
  if (!teamMembership || teamMembership.membership.orgId !== orgId) return { error: "Roster entry not found." };

  const parsed = playerActionSchema.safeParse({
    type: formData.get("type"),
    reason: formData.get("reason"),
    startDate: formData.get("startDate") ?? "",
    endDate: formData.get("endDate") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await prisma.playerAction.create({
    data: {
      orgId,
      teamMembershipId,
      type: parsed.data.type,
      reason: parsed.data.reason,
      startDate: parsed.data.startDate ? new Date(`${parsed.data.startDate}T00:00:00Z`) : null,
      endDate: parsed.data.endDate ? new Date(`${parsed.data.endDate}T00:00:00Z`) : null,
      createdById: actor.membershipId,
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: parsed.data.type === "BENCHED" ? "player_action.benched" : "player_action.disciplinary_recorded",
    targetType: "TeamMembership",
    targetId: teamMembershipId,
    metadata: { teamName: teamMembership.team.name, playerName: teamMembership.membership.user.name },
  });

  revalidatePath(`/${orgSlug}/roster/${membershipId}`);
  revalidatePath(`/${orgSlug}/teams/${teamMembership.team.slug}`);
  return { success: "Recorded." };
}

export async function deletePlayerActionAction(
  orgSlug: string,
  orgId: string,
  playerActionId: string,
  membershipId: string,
): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.player_actions_manage);

  const action = await prisma.playerAction.findUnique({
    where: { id: playerActionId },
    include: { teamMembership: { include: { team: true } } },
  });
  if (!action || action.orgId !== orgId) return { error: "Not found." };

  await prisma.playerAction.delete({ where: { id: playerActionId } });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "player_action.deleted",
    targetType: "TeamMembership",
    targetId: action.teamMembershipId,
    metadata: { type: action.type },
  });

  revalidatePath(`/${orgSlug}/roster/${membershipId}`);
  revalidatePath(`/${orgSlug}/teams/${action.teamMembership.team.slug}`);
  return { success: "Removed." };
}
