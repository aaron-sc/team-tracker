import "server-only";
import { prisma } from "@/lib/db/prisma";

export async function createNotification(params: {
  membershipId: string;
  type: string;
  title: string;
  body?: string;
  linkUrl?: string;
}) {
  await prisma.notification.create({
    data: {
      membershipId: params.membershipId,
      type: params.type,
      title: params.title,
      body: params.body,
      linkUrl: params.linkUrl,
    },
  });
}
