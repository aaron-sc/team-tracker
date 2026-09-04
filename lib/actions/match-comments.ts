"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireMembership } from "@/lib/auth/authorize";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

const MAX_LENGTH = 2000;

/** Anyone on the match's own team roster, or anyone who can edit matches org-wide (e.g. a head
 *  coach overseeing multiple teams), can post — same bar as viewing the discussion at all. */
async function requireMatchDiscussionAccess(orgId: string, teamId: string) {
  const { membership } = await requireMembership(orgId);
  const allowed = membership.teamIds.includes(teamId) || membership.permissions.includes(Permission.match_edit);
  if (!allowed) throw new Error("You don't have access to this team's discussion.");
  return membership;
}

export async function postMatchCommentAction(orgSlug: string, orgId: string, matchId: string, formData: FormData): Promise<ActionState> {
  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { team: true } });
  if (!match || match.team.orgId !== orgId) return { error: "Match not found." };

  const membership = await requireMatchDiscussionAccess(orgId, match.teamId);

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write something first." };
  if (body.length > MAX_LENGTH) return { error: `Keep it under ${MAX_LENGTH} characters.` };

  await prisma.matchComment.create({ data: { matchId, membershipId: membership.membershipId, body } });

  revalidatePath(`/${orgSlug}/schedule/matches/${matchId}`);
  return { success: "Posted." };
}

export async function deleteMatchCommentAction(orgSlug: string, orgId: string, matchId: string, commentId: string): Promise<ActionState> {
  const { membership } = await requireMembership(orgId);
  const comment = await prisma.matchComment.findUnique({ where: { id: commentId }, include: { match: { include: { team: true } } } });
  if (!comment || comment.match.team.orgId !== orgId) return { error: "Not found." };

  const isAuthor = comment.membershipId === membership.membershipId;
  const canModerate = membership.permissions.includes(Permission.match_edit);
  if (!isAuthor && !canModerate) return { error: "You can only remove your own messages." };

  await prisma.matchComment.delete({ where: { id: commentId } });

  revalidatePath(`/${orgSlug}/schedule/matches/${matchId}`);
  return { success: "Removed." };
}
