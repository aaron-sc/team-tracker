"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { ActionState } from "@/lib/actions/types";

export async function savePushSubscriptionAction(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be logged in." };

  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return { error: "Invalid subscription." };
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId: session.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    // Re-subscribing (e.g. keys rotated by the browser) should re-attach to whoever's logged in
    // now, not silently keep pointing at a previous account on a shared device.
    update: { userId: session.user.id, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  });

  return { success: "Push notifications enabled on this device." };
}

export async function deletePushSubscriptionAction(endpoint: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be logged in." };

  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.user.id } });
  return { success: "Push notifications disabled on this device." };
}
