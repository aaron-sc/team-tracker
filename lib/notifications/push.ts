import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/db/prisma";

const configured = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

if (configured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:support@example.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

/**
 * Pushes a browser notification to every device a user has enabled it on. Silently a no-op when
 * VAPID keys aren't configured (self-hosted deploys work fine without this feature) or the user
 * has no subscriptions — callers don't need to check either case themselves. A subscription the
 * push service reports as expired/revoked (410 Gone, or 404 if the endpoint's just gone) is
 * cleaned up automatically rather than retried forever.
 */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body?: string; linkUrl?: string },
): Promise<void> {
  if (!configured) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error("[push] send failed:", err instanceof Error ? err.message : err);
        }
      }
    }),
  );
}
