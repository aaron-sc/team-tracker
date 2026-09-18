"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { Permission } from "@/lib/generated/prisma/enums";
import { teamDiscordSettingsSchema } from "@/lib/validations/team";
import type { ActionState } from "@/lib/actions/types";
import {
  sendDiscordWebhook,
  FORMATION_EMBED_COLOR,
  DISCORD_WEBHOOK_PATTERN,
  DISCORD_SNOWFLAKE_PATTERN,
  roleMentionPrefix,
} from "@/lib/integrations/discord";
import { postInteractiveReminder } from "@/lib/integrations/discord-bot";

function toReminderMinutesJson(values: string[]) {
  const nums = [...new Set(values.map(Number).filter((n) => Number.isFinite(n) && n > 0))].sort((a, b) => a - b);
  return nums.length > 0 ? nums : Prisma.JsonNull;
}

export async function updateTeamDiscordSettingsAction(
  orgSlug: string,
  orgId: string,
  teamId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.team_edit);

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.orgId !== orgId) return { error: "Team not found." };

  const parsed = teamDiscordSettingsSchema.safeParse({
    webhookUrl: formData.get("webhookUrl") ?? "",
    mentionRoleId: formData.get("mentionRoleId") ?? "",
    matchReminderMinutes: formData.getAll("matchReminderMinutes"),
    practiceReminderMinutes: formData.getAll("practiceReminderMinutes"),
    scrimReminderMinutes: formData.getAll("scrimReminderMinutes"),
    notifyOnCreate: formData.get("notifyOnCreate") === "on",
    reminderChannelId: formData.get("reminderChannelId") ?? "",
    roleId: formData.get("roleId") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const webhookUrl = (parsed.data.webhookUrl ?? "").trim();
  if (webhookUrl && !DISCORD_WEBHOOK_PATTERN.test(webhookUrl)) {
    return { error: "That doesn't look like a Discord webhook URL." };
  }

  const mentionRoleId = (parsed.data.mentionRoleId ?? "").trim();
  if (mentionRoleId && !DISCORD_SNOWFLAKE_PATTERN.test(mentionRoleId)) {
    return { error: "That doesn't look like a Discord role ID (should be a 17-20 digit number)." };
  }

  // The channel/role pickers use "none" as their empty-selection sentinel (Radix Select
  // disallows an actual empty string value).
  const reminderChannelId = parsed.data.reminderChannelId === "none" ? "" : (parsed.data.reminderChannelId ?? "").trim();
  const roleId = parsed.data.roleId === "none" ? "" : (parsed.data.roleId ?? "").trim();

  await prisma.team.update({
    where: { id: teamId },
    data: {
      discordWebhookUrl: webhookUrl || null,
      discordMentionRoleId: mentionRoleId || null,
      discordMatchReminderMinutes: toReminderMinutesJson(parsed.data.matchReminderMinutes),
      discordPracticeReminderMinutes: toReminderMinutesJson(parsed.data.practiceReminderMinutes),
      discordScrimReminderMinutes: toReminderMinutesJson(parsed.data.scrimReminderMinutes),
      discordNotifyOnCreate: parsed.data.notifyOnCreate,
      discordReminderChannelId: reminderChannelId || null,
      discordRoleId: roleId || null,
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "team.discord_settings_updated",
    targetType: "Team",
    targetId: teamId,
  });

  revalidatePath(`/${orgSlug}/teams/${team.slug}/edit`);
  return { success: "Discord settings saved." };
}

export async function testTeamDiscordWebhookAction(orgId: string, teamId: string): Promise<ActionState> {
  await requirePermission(orgId, Permission.team_edit);

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.orgId !== orgId) return { error: "Team not found." };
  if (!team.discordWebhookUrl) return { error: "No webhook configured yet." };

  const result = await sendDiscordWebhook(team.discordWebhookUrl, {
    content: roleMentionPrefix(team.discordMentionRoleId) || undefined,
    embeds: [
      {
        title: "Formation is connected",
        description: `Test message for **${team.name}**. Announcements and reminders will post here.`,
        color: FORMATION_EMBED_COLOR,
      },
    ],
  });

  return result.ok ? { success: "Test message sent — check your Discord channel." } : { error: result.error };
}

/** Posts a fake practice reminder — with the same ✅/❌ RSVP buttons a real match/practice
 *  reminder gets — to confirm the bot's reminder channel (not just the plain webhook above)
 *  actually works. Uses a sentinel eventId that can't match a real match/session, so clicking
 *  the buttons just replies "no longer exists" (see handleRsvpButton) instead of touching real
 *  attendance data. */
export async function testTeamDiscordReminderAction(orgId: string, teamId: string): Promise<ActionState> {
  await requirePermission(orgId, Permission.team_edit);

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.orgId !== orgId) return { error: "Team not found." };
  if (!team.discordReminderChannelId) return { error: "No bot reminder channel configured yet." };

  const result = await postInteractiveReminder(
    team.discordReminderChannelId,
    "PRACTICE",
    "test",
    "Practice — Test",
    `Test reminder for **${team.name}**. The buttons below are just for show — this isn't tied to a real event, so RSVPing here won't affect anyone's real attendance.`,
  );

  return result.ok ? { success: "Test reminder sent — check your Discord channel." } : { error: result.error };
}
