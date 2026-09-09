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
import { createNotification } from "@/lib/notifications/create";

/** Everyone who should get an in-app notification when an announcement goes live — the team's
 *  roster if it's team-scoped, otherwise every org member. */
async function announcementRecipients(orgId: string, teamId: string | null, excludeMembershipId?: string): Promise<string[]> {
  let ids: string[];
  if (teamId) {
    const rows = await prisma.teamMembership.findMany({ where: { teamId }, select: { membershipId: true } });
    ids = rows.map((r) => r.membershipId);
  } else {
    const rows = await prisma.membership.findMany({ where: { orgId }, select: { id: true } });
    ids = rows.map((r) => r.id);
  }
  return ids.filter((id) => id !== excludeMembershipId);
}

/** The side effects of an announcement going live right now: in-app notifications to its
 *  audience plus a Discord post. Shared by creating-and-publishing-immediately and duplicating
 *  (a duplicate is itself a fresh, immediately-live post — not a re-broadcast of the original). */
async function announceNow(params: {
  orgId: string;
  orgSlug: string;
  teamId: string | null;
  title: string;
  body: string;
  pinned: boolean;
  authorName: string | null;
  excludeMembershipId: string;
}) {
  const recipients = await announcementRecipients(params.orgId, params.teamId, params.excludeMembershipId);
  await Promise.all(
    recipients.map((membershipId) =>
      createNotification({
        membershipId,
        type: "announcement_published",
        title: params.title,
        linkUrl: `/${params.orgSlug}/announcements`,
      }),
    ),
  );

  let webhookUrl: string | null | undefined;
  let mentionRoleId: string | null | undefined;
  if (params.teamId) {
    const team = await prisma.team.findUnique({
      where: { id: params.teamId },
      select: { discordWebhookUrl: true, discordMentionRoleId: true },
    });
    webhookUrl = team?.discordWebhookUrl;
    mentionRoleId = team?.discordMentionRoleId;
  }
  if (!webhookUrl) {
    const orgWebhook = await prisma.organization.findUnique({ where: { id: params.orgId }, select: { discordWebhookUrl: true } });
    webhookUrl = orgWebhook?.discordWebhookUrl;
    mentionRoleId = null;
  }
  await notifyDiscord(webhookUrl, {
    content: roleMentionPrefix(mentionRoleId) || undefined,
    embeds: [
      {
        title: params.title,
        description: params.body.slice(0, 1500),
        color: FORMATION_EMBED_COLOR,
        footer: { text: `${params.authorName ?? "Formation"} • Announcement${params.pinned ? " (pinned)" : ""}` },
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

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
    await announceNow({
      orgId,
      orgSlug,
      teamId,
      title: announcement.title,
      body: announcement.body,
      pinned,
      authorName: session.user.name ?? null,
      excludeMembershipId: membership.membershipId,
    });
  }

  revalidatePath(`/${orgSlug}/announcements`);
  revalidatePath(`/${orgSlug}/dashboard`);
  redirect(`/${orgSlug}/announcements`);
}

export async function updateAnnouncementAction(
  orgSlug: string,
  orgId: string,
  announcementId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.announcement_create);

  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!announcement || announcement.orgId !== orgId) return { error: "Not found." };

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    teamId: formData.get("teamId") ?? "",
    pinned: formData.get("pinned") === "on",
    publishAt: "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const teamId = parsed.data.teamId && parsed.data.teamId !== "none" ? parsed.data.teamId : null;
  const pinned = parsed.data.pinned && membership.permissions.includes(Permission.announcement_pin);

  await prisma.announcement.update({
    where: { id: announcementId },
    data: { title: parsed.data.title, body: parsed.data.body, teamId, pinned },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "announcement.updated",
    targetType: "Announcement",
    targetId: announcementId,
    metadata: { title: parsed.data.title },
  });

  revalidatePath(`/${orgSlug}/announcements`);
  revalidatePath(`/${orgSlug}/dashboard`);
  return { success: "Saved." };
}

export async function duplicateAnnouncementAction(orgSlug: string, orgId: string, announcementId: string): Promise<ActionState> {
  const { session, membership } = await requirePermission(orgId, Permission.announcement_create);

  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!announcement || announcement.orgId !== orgId) return { error: "Not found." };

  // A duplicate is a fresh, immediately-live post with the same content — not a silent draft
  // (which would have no way to publish later) and not a re-broadcast of the original (it never
  // inherits a stale schedule).
  const copy = await prisma.announcement.create({
    data: {
      orgId,
      teamId: announcement.teamId,
      authorId: membership.membershipId,
      title: `${announcement.title} (copy)`,
      body: announcement.body,
      pinned: false,
      publishAt: null,
      published: true,
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "announcement.duplicated",
    targetType: "Announcement",
    targetId: copy.id,
    metadata: { sourceAnnouncementId: announcementId },
  });

  await announceNow({
    orgId,
    orgSlug,
    teamId: announcement.teamId,
    title: copy.title,
    body: copy.body,
    pinned: false,
    authorName: session.user.name ?? null,
    excludeMembershipId: membership.membershipId,
  });

  revalidatePath(`/${orgSlug}/announcements`);
  return { success: "Duplicated and posted." };
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
