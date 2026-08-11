import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("orgId");
  const membership = session.memberships.find((m) => m.orgId === orgId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { membershipId: membership.membershipId },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.notification.count({ where: { membershipId: membership.membershipId, isRead: false } }),
  ]);

  return NextResponse.json({
    unreadCount,
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      linkUrl: n.linkUrl,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}
