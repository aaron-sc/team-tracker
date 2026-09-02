"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { announcementSchema } from "@/lib/validations/announcement";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";
import { notifyDiscord, FORMATION_EMBED_COLOR, roleMentionPrefix } from "@/lib/integrations/discord";

export async function createAnnouncementAction(orgSlug: string, orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { session, membership } = await requirePermission(orgId, Permission.announcement_create);

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    teamId: formData.get("teamId") ?? "",
    pinned: formData.get("pinned") === "on",
    publishAt: formData.get("publishAt") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // The team <Select> can't use an empty-string value (Radix reserves "" for "no selection"), so
  // the "entire organization" option submits the sentinel "none" instead — treat that the same
  // as no team chosen, rather than passing "none" straight through as a team id.
  const teamId = parsed.data.teamId && parsed.data.teamId !== "none" ? parsed.data.teamId : null;
  const pinned = parsed.data.pinned && membership.permissions.includes(Permission.announcement_pin);

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { timezone: true } });
  const publishAt = parsed.data.publishAt ? fromZonedTime(parsed.data.publishAt, org.timezone) : null;
  const scheduledForLater = !!publishAt && publishAt.getTime() > Date.now();

  const announcement = await prisma.announcement.create({
    data: {
      orgId,
      teamId,
      authorId: membership.membershipId,
      title: parsed.data.title,
      body: parsed.data.body,
      pinned,
      publishAt: scheduledForLater ? publishAt : null,
      published: !scheduledForLater,
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "announcement.created",
    targetType: "Announcement",
    targetId: announcement.id,
    metadata: { title: announcement.title, scheduled: scheduledForLater },
  });

  if (!scheduledForLater) {
    let webhookUrl: string | null | undefined;
    let mentionRoleId: string | null | undefined;
    if (teamId) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { discordWebhookUrl: true, discordMentionRoleId: true },
      });
      webhookUrl = team?.discordWebhookUrl;
      mentionRoleId = team?.discordMentionRoleId;
    }
    if (!webhookUrl) {
      const orgWebhook = await prisma.organization.findUnique({ where: { id: orgId }, select: { discordWebhookUrl: true } });
      webhookUrl = orgWebhook?.discordWebhookUrl;
      mentionRoleId = null;
    }
    await notifyDiscord(webhookUrl, {
      content: roleMentionPrefix(mentionRoleId) || undefined,
      embeds: [
        {
          title: parsed.data.title,
          description: parsed.data.body.slice(0, 1500),
          color: FORMATION_EMBED_COLOR,
          footer: { text: `${session.user.name ?? "Formation"} • Announcement${pinned ? " (pinned)" : ""}` },
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }

  revalidatePath(`/${orgSlug}/announcements`);
  revalidatePath(`/${orgSlug}/dashboard`);
  redirect(`/${orgSlug}/announcements`);
}

export async function deleteAnnouncementAction(orgSlug: string, orgId: string, announcementId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.announcement_delete);

  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!announcement || announcement.orgId !== orgId) return { error: "Not found." };

  await prisma.announcement.delete({ where: { id: announcementId } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "announcement.deleted",
    targetType: "Announcement",
    targetId: announcementId,
    metadata: { title: announcement.title },
  });

  revalidatePath(`/${orgSlug}/announcements`);
  revalidatePath(`/${orgSlug}/dashboard`);
}
