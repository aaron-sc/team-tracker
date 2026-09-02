"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

export async function enablePublicRosterAction(orgSlug: string, orgId: string, teamId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.team_edit);

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.orgId !== orgId) return { error: "Team not found." };

  await prisma.team.update({
    where: { id: teamId },
    data: { publicRosterEnabled: true, publicRosterToken: team.publicRosterToken ?? crypto.randomUUID() },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "team.public_roster_enabled",
    targetType: "Team",
    targetId: teamId,
  });

  revalidatePath(`/${orgSlug}/teams/${team.slug}/edit`);
  return { success: "Public roster embed enabled." };
}

export async function disablePublicRosterAction(orgSlug: string, orgId: string, teamId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.team_edit);

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.orgId !== orgId) return { error: "Team not found." };

  // Token is kept (not cleared) so re-enabling later doesn't silently change a link someone may
  // have already embedded — the enabled flag alone gates access.
  await prisma.team.update({ where: { id: teamId }, data: { publicRosterEnabled: false } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "team.public_roster_disabled",
    targetType: "Team",
    targetId: teamId,
  });

  revalidatePath(`/${orgSlug}/teams/${team.slug}/edit`);
  return { success: "Public roster embed disabled." };
}

export async function rotatePublicRosterTokenAction(orgSlug: string, orgId: string, teamId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.team_edit);

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.orgId !== orgId) return { error: "Team not found." };

  await prisma.team.update({ where: { id: teamId }, data: { publicRosterToken: crypto.randomUUID() } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "team.public_roster_token_rotated",
    targetType: "Team",
    targetId: teamId,
  });

  revalidatePath(`/${orgSlug}/teams/${team.slug}/edit`);
  return { success: "Link rotated — the old embed link no longer works." };
}
