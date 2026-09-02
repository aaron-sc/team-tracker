import "server-only";
import { prisma } from "@/lib/db/prisma";
import { sendPushToUser } from "@/lib/notifications/push";

export async function createNotification(params: {
  membershipId: string;
  type: string;
  title: string;
  body?: string;
  linkUrl?: string;
}) {
  const [notification, membership] = await Promise.all([
    prisma.notification.create({
      data: {
        membershipId: params.membershipId,
        type: params.type,
        title: params.title,
        body: params.body,
        linkUrl: params.linkUrl,
      },
    }),
    prisma.membership.findUnique({ where: { id: params.membershipId }, select: { userId: true } }),
  ]);

  // Fire-and-forget: a push failure should never block the in-app notification that already
  // landed above.
  if (membership) {
    sendPushToUser(membership.userId, { title: params.title, body: params.body, linkUrl: params.linkUrl }).catch(
      () => {},
    );
  }

  return notification;
}
