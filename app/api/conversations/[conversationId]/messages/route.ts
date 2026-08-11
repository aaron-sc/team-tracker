import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = session.memberships.find((m) => m.orgId === conversation.orgId);
  if (
    !membership ||
    (membership.membershipId !== conversation.memberAId && membership.membershipId !== conversation.memberBId)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sinceParam = req.nextUrl.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : undefined;

  const messages = await prisma.message.findMany({
    where: { conversationId, ...(since ? { createdAt: { gt: since } } : {}) },
    orderBy: { createdAt: "asc" },
    include: { sender: { include: { user: true } } },
  });

  const otherId = conversation.memberAId === membership.membershipId ? conversation.memberBId : conversation.memberAId;
  await prisma.message.updateMany({
    where: { conversationId, senderId: otherId, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      senderId: m.senderId,
      senderName: m.sender.user.name,
    })),
  });
}
