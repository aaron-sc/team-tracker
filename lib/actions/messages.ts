"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireMembership } from "@/lib/auth/authorize";
import { createNotification } from "@/lib/notifications/create";
import { messageSchema } from "@/lib/validations/messages";
import type { ActionState } from "@/lib/actions/types";

function sortPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function startConversationAction(
  orgSlug: string,
  orgId: string,
  otherMembershipId: string,
): Promise<ActionState> {
  const { membership } = await requireMembership(orgId);
  if (membership.membershipId === otherMembershipId) {
    return { error: "You can't message yourself." };
  }

  const other = await prisma.membership.findUnique({ where: { id: otherMembershipId } });
  if (!other || other.orgId !== orgId) return { error: "Member not found." };

  const [memberAId, memberBId] = sortPair(membership.membershipId, otherMembershipId);
  const conversation = await prisma.conversation.upsert({
    where: { orgId_memberAId_memberBId: { orgId, memberAId, memberBId } },
    update: {},
    create: { orgId, memberAId, memberBId },
  });

  redirect(`/${orgSlug}/messages/${conversation.id}`);
}

export async function sendMessageAction(
  orgSlug: string,
  orgId: string,
  conversationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { session, membership } = await requireMembership(orgId);

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || conversation.orgId !== orgId) return { error: "Conversation not found." };
  if (conversation.memberAId !== membership.membershipId && conversation.memberBId !== membership.membershipId) {
    return { error: "Not your conversation." };
  }

  const parsed = messageSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid message." };

  const message = await prisma.message.create({
    data: { conversationId, senderId: membership.membershipId, body: parsed.data.body },
  });
  await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: message.createdAt } });

  const recipientId = conversation.memberAId === membership.membershipId ? conversation.memberBId : conversation.memberAId;
  await createNotification({
    membershipId: recipientId,
    type: "message",
    title: `New message from ${session.user.name ?? "a teammate"}`,
    body: parsed.data.body.slice(0, 140),
    linkUrl: `/${orgSlug}/messages/${conversationId}`,
  });

  revalidatePath(`/${orgSlug}/messages/${conversationId}`);
  revalidatePath(`/${orgSlug}/messages`);
}
