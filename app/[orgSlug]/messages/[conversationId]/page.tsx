import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageThread } from "@/components/messages/message-thread";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ orgSlug: string; conversationId: string }>;
}) {
  const { orgSlug, conversationId } = await params;
  const { org, membership } = await getOrgContext(orgSlug);

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { memberA: { include: { user: true } }, memberB: { include: { user: true } } },
  });
  if (!conversation || conversation.orgId !== org.id) notFound();
  if (conversation.memberAId !== membership.membershipId && conversation.memberBId !== membership.membershipId) {
    notFound();
  }

  const other = conversation.memberAId === membership.membershipId ? conversation.memberB : conversation.memberA;

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    include: { sender: { include: { user: true } } },
  });

  await prisma.message.updateMany({
    where: { conversationId, senderId: other.id, readAt: null },
    data: { readAt: new Date() },
  });

  const initials = other.user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-[calc(100vh-8.5rem)] max-w-2xl flex-col">
      <div className="mb-1 flex items-center gap-3 border-b pb-3">
        <Link href={`/${orgSlug}/messages`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
        </Link>
        <Avatar className="size-8">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <p className="font-medium">{other.user.name}</p>
      </div>
      <MessageThread
        orgSlug={orgSlug}
        orgId={org.id}
        conversationId={conversationId}
        currentMembershipId={membership.membershipId}
        initialMessages={messages.map((m) => ({
          id: m.id,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          senderId: m.senderId,
          senderName: m.sender.user.name,
        }))}
      />
    </div>
  );
}
