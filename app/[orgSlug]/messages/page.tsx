import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NewConversationDialog } from "@/components/messages/new-conversation-dialog";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function MessagesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  const canViewEmails = membership.permissions.includes(Permission.org_members_contact_view);

  const [conversations, members] = await Promise.all([
    prisma.conversation.findMany({
      where: { orgId: org.id, OR: [{ memberAId: membership.membershipId }, { memberBId: membership.membershipId }] },
      include: {
        memberA: { include: { user: true } },
        memberB: { include: { user: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { lastMessageAt: "desc" },
    }),
    prisma.membership.findMany({
      where: { orgId: org.id, id: { not: membership.membershipId } },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const unreadCounts = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversations.map((c) => c.id) },
      senderId: { not: membership.membershipId },
      readAt: null,
    },
    _count: true,
  });
  const unreadByConversation = new Map(unreadCounts.map((u) => [u.conversationId, u._count]));

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
        </p>
        <NewConversationDialog
          orgSlug={orgSlug}
          orgId={org.id}
          members={members.map((m) => ({ id: m.id, name: m.user.name, email: canViewEmails ? m.user.email : null }))}
        />
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No conversations yet. Start one with a teammate.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => {
            const other = c.memberAId === membership.membershipId ? c.memberB : c.memberA;
            const lastMessage = c.messages[0];
            const unread = unreadByConversation.get(c.id) ?? 0;
            return (
              <Link key={c.id} href={`/${orgSlug}/messages/${c.id}`}>
                <Card className="transition-colors hover:bg-accent">
                  <CardContent className="flex items-center gap-3 py-3">
                    <Avatar className="size-9">
                      <AvatarFallback>{initials(other.user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{other.user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lastMessage ? lastMessage.body : "No messages yet"}
                      </p>
                    </div>
                    {unread > 0 ? <Badge>{unread}</Badge> : null}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
