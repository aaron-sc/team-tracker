"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireMembership } from "@/lib/auth/authorize";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

const MAX_LENGTH = 2000;

async function requirePracticeDiscussionAccess(orgId: string, teamId: string) {
  const { membership } = await requireMembership(orgId);
  const allowed = membership.teamIds.includes(teamId) || membership.permissions.includes(Permission.practice_edit);
  if (!allowed) throw new Error("You don't have access to this team's discussion.");
  return membership;
}

export async function postPracticeCommentAction(orgSlug: string, orgId: string, sessionId: string, formData: FormData): Promise<ActionState> {
  const session = await prisma.practiceSession.findUnique({ where: { id: sessionId }, include: { team: true } });
  if (!session || session.team.orgId !== orgId) return { error: "Session not found." };

  const membership = await requirePracticeDiscussionAccess(orgId, session.teamId);

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write something first." };
  if (body.length > MAX_LENGTH) return { error: `Keep it under ${MAX_LENGTH} characters.` };

  await prisma.practiceComment.create({ data: { sessionId, membershipId: membership.membershipId, body } });

  revalidatePath(`/${orgSlug}/schedule/practice/${sessionId}`);
  return { success: "Posted." };
}

export async function deletePracticeCommentAction(orgSlug: string, orgId: string, sessionId: string, commentId: string): Promise<ActionState> {
  const { membership } = await requireMembership(orgId);
  const comment = await prisma.practiceComment.findUnique({ where: { id: commentId }, include: { session: { include: { team: true } } } });
  if (!comment || comment.session.team.orgId !== orgId) return { error: "Not found." };

  const isAuthor = comment.membershipId === membership.membershipId;
  const canModerate = membership.permissions.includes(Permission.practice_edit);
  if (!isAuthor && !canModerate) return { error: "You can only remove your own messages." };

  await prisma.practiceComment.delete({ where: { id: commentId } });

  revalidatePath(`/${orgSlug}/schedule/practice/${sessionId}`);
  return { success: "Removed." };
}
