import "server-only";
import { prisma } from "@/lib/db/prisma";
import { notifyDiscord, FORMATION_EMBED_COLOR, roleMentionPrefix } from "@/lib/integrations/discord";
import { createNotification } from "@/lib/notifications/create";

/** Publishes any announcement whose scheduled time has arrived — flips it visible and sends its
 *  Discord post (deferred at creation time specifically so it goes out now, not when it was
 *  written). Called from the same background sweep as the Discord reminder scheduler. */
export async function sweepScheduledAnnouncements() {
  const due = await prisma.announcement.findMany({
    where: { published: false, publishAt: { lte: new Date() } },
    include: { team: true, author: { include: { user: true } }, org: { select: { slug: true } } },
  });

  for (const a of due) {
    await prisma.announcement.update({ where: { id: a.id }, data: { published: true } });

    const recipientIds = a.teamId
      ? (await prisma.teamMembership.findMany({ where: { teamId: a.teamId }, select: { membershipId: true } })).map(
          (r) => r.membershipId,
        )
      : (await prisma.membership.findMany({ where: { orgId: a.orgId }, select: { id: true } })).map((r) => r.id);
    await Promise.all(
      recipientIds.map((membershipId) =>
        createNotification({
          membershipId,
          type: "announcement_published",
          title: a.title,
          linkUrl: `/${a.org.slug}/announcements`,
        }),
      ),
    );

    let webhookUrl = a.team?.discordWebhookUrl ?? null;
    let mentionRoleId = a.team?.discordWebhookUrl ? a.team.discordMentionRoleId : null;
    if (!webhookUrl) {
      const org = await prisma.organization.findUnique({ where: { id: a.orgId }, select: { discordWebhookUrl: true } });
      webhookUrl = org?.discordWebhookUrl ?? null;
      mentionRoleId = null;
    }

    await notifyDiscord(webhookUrl, {
      content: roleMentionPrefix(mentionRoleId) || undefined,
      embeds: [
        {
          title: a.title,
          description: a.body.slice(0, 1500),
          color: FORMATION_EMBED_COLOR,
          footer: { text: `${a.author?.user.name ?? "Formation"} • Announcement${a.pinned ? " (pinned)" : ""}` },
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }
}
