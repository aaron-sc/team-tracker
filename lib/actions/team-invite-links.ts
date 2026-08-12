"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireMembership, requireTeamScope, hasPermission, ForbiddenError } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";
import type { Session } from "next-auth";
import type { SessionMembership } from "@/lib/auth/types";

/** Org-wide inviters can create a link for any team; team_members_invite holders only for their own team(s). */
async function requireTeamInvitePermission(
  orgId: string,
  teamId: string,
): Promise<{ session: Session; membership: SessionMembership }> {
  const { session, membership } = await requireMembership(orgId);
  if (hasPermission(membership, Permission.org_members_invite)) return { session, membership };
  if (!hasPermission(membership, Permission.team_members_invite)) {
    throw new ForbiddenError();
  }
  requireTeamScope(membership, teamId);
  return { session, membership };
}

export async function createTeamInviteLinkAction(
  orgSlug: string,
  orgId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const teamId = formData.get("teamId");
  const roleId = formData.get("roleId");
  if (typeof teamId !== "string" || !teamId) return { error: "Choose a team." };
  if (typeof roleId !== "string" || !roleId) return { error: "Choose a role." };

  const { membership } = await requireTeamInvitePermission(orgId, teamId);

  const [role, team] = await Promise.all([
    prisma.role.findUnique({ where: { id: roleId } }),
    prisma.team.findUnique({ where: { id: teamId } }),
  ]);
  if (!role || role.orgId !== orgId) return { error: "Invalid role." };
  if (!team || team.orgId !== orgId) return { error: "Team not found." };

  const token = crypto.randomBytes(24).toString("base64url");
  await prisma.teamInviteLink.create({
    data: { orgId, teamId, roleId, token, createdById: membership.membershipId },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "team_invite_link.created",
    targetType: "TeamInviteLink",
    targetId: token,
    metadata: { teamId, roleId },
  });

  revalidatePath(`/${orgSlug}/teams/${team.slug}`);
  revalidatePath(`/${orgSlug}/settings/members`);
  return { success: "Invite link created." };
}

export async function revokeTeamInviteLinkAction(orgSlug: string, orgId: string, linkId: string): Promise<ActionState> {
  const link = await prisma.teamInviteLink.findUnique({ where: { id: linkId }, include: { team: true } });
  if (!link || link.orgId !== orgId) return { error: "Not found." };

  await requireTeamInvitePermission(orgId, link.teamId);

  await prisma.teamInviteLink.update({ where: { id: linkId }, data: { revokedAt: new Date() } });

  revalidatePath(`/${orgSlug}/teams/${link.team.slug}`);
  revalidatePath(`/${orgSlug}/settings/members`);
}
