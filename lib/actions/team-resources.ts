"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { teamResourceLinkSchema } from "@/lib/validations/team-resource-link";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

export async function addTeamResourceLinkAction(
  orgSlug: string,
  orgId: string,
  teamId: string,
  teamSlug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.team_resources_manage);

  const parsed = teamResourceLinkSchema.safeParse({ title: formData.get("title"), url: formData.get("url") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await prisma.teamResourceLink.create({
    data: { teamId, title: parsed.data.title, url: parsed.data.url, addedById: actor.membershipId },
  });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "team_resource.added",
    targetType: "Team",
    targetId: teamId,
    metadata: { title: parsed.data.title },
  });

  revalidatePath(`/${orgSlug}/teams/${teamSlug}`);
  return { success: "Added." };
}

export async function deleteTeamResourceLinkAction(
  orgSlug: string,
  orgId: string,
  resourceLinkId: string,
  teamSlug: string,
): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.team_resources_manage);

  const link = await prisma.teamResourceLink.findUnique({ where: { id: resourceLinkId }, include: { team: true } });
  if (!link || link.team.orgId !== orgId) return { error: "Not found." };

  await prisma.teamResourceLink.delete({ where: { id: resourceLinkId } });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "team_resource.deleted",
    targetType: "Team",
    targetId: link.teamId,
    metadata: { title: link.title },
  });

  revalidatePath(`/${orgSlug}/teams/${teamSlug}`);
  return { success: "Removed." };
}
