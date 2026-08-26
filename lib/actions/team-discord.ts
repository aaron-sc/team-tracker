"use server";

import { revalidatePath } from "next/cache";
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

function parseReminderMinutes(value: string): number | null {
  return value === "off" ? null : Number(value);
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
    matchReminderMinutes: formData.get("matchReminderMinutes"),
    practiceReminderMinutes: formData.get("practiceReminderMinutes"),
    scrimReminderMinutes: formData.get("scrimReminderMinutes"),
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

  await prisma.team.update({
    where: { id: teamId },
    data: {
      discordWebhookUrl: webhookUrl || null,
      discordMentionRoleId: mentionRoleId || null,
      discordMatchReminderMinutes: parseReminderMinutes(parsed.data.matchReminderMinutes),
      discordPracticeReminderMinutes: parseReminderMinutes(parsed.data.practiceReminderMinutes),
      discordScrimReminderMinutes: parseReminderMinutes(parsed.data.scrimReminderMinutes),
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
