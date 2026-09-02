"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, requireMembership } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { createPollSchema } from "@/lib/validations/poll";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

export async function createPollAction(
  orgSlug: string,
  orgId: string,
  teamId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.poll_manage);

  const parsed = createPollSchema.safeParse({
    question: formData.get("question"),
    options: formData.getAll("options").filter((v) => String(v).trim().length > 0),
    closesAt: formData.get("closesAt") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await prisma.poll.create({
    data: {
      orgId,
      teamId,
      question: parsed.data.question,
      createdById: actor.membershipId,
      closesAt: parsed.data.closesAt ? new Date(parsed.data.closesAt) : null,
      options: { create: parsed.data.options.map((label, order) => ({ label, order })) },
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "poll.created",
    targetType: "Poll",
    targetId: teamId ?? orgId,
    metadata: { question: parsed.data.question },
  });

  revalidatePath(`/${orgSlug}/teams`);
  revalidatePath(`/${orgSlug}/announcements`);
  return { success: "Poll posted." };
}

export async function votePollAction(orgSlug: string, orgId: string, pollId: string, pollOptionId: string): Promise<ActionState> {
  const { membership } = await requireMembership(orgId);

  const poll = await prisma.poll.findUnique({ where: { id: pollId }, include: { team: true } });
  if (!poll || poll.orgId !== orgId) return { error: "Poll not found." };
  if (poll.closesAt && poll.closesAt < new Date()) return { error: "This poll is closed." };

  const option = await prisma.pollOption.findUnique({ where: { id: pollOptionId } });
  if (!option || option.pollId !== pollId) return { error: "Invalid option." };

  await prisma.pollVote.upsert({
    where: { pollId_membershipId: { pollId, membershipId: membership.membershipId } },
    create: { pollId, pollOptionId, membershipId: membership.membershipId },
    update: { pollOptionId },
  });

  revalidatePath(`/${orgSlug}/teams`);
  revalidatePath(`/${orgSlug}/announcements`);
  return { success: "Vote recorded." };
}

export async function closePollAction(orgSlug: string, orgId: string, pollId: string): Promise<ActionState> {
  await requirePermission(orgId, Permission.poll_manage);

  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll || poll.orgId !== orgId) return { error: "Poll not found." };

  await prisma.poll.update({ where: { id: pollId }, data: { closesAt: new Date() } });

  revalidatePath(`/${orgSlug}/teams`);
  revalidatePath(`/${orgSlug}/announcements`);
  return { success: "Poll closed." };
}

export async function deletePollAction(orgSlug: string, orgId: string, pollId: string): Promise<ActionState> {
  await requirePermission(orgId, Permission.poll_manage);

  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll || poll.orgId !== orgId) return { error: "Poll not found." };

  await prisma.poll.delete({ where: { id: pollId } });

  revalidatePath(`/${orgSlug}/teams`);
  revalidatePath(`/${orgSlug}/announcements`);
  return { success: "Poll deleted." };
}
