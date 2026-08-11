"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";
import { sendDiscordWebhook, FORMATION_EMBED_COLOR } from "@/lib/integrations/discord";

const DISCORD_WEBHOOK_PATTERN = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;

export async function saveDiscordWebhookAction(
  orgSlug: string,
  orgId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.org_settings_manage);

  const raw = formData.get("webhookUrl");
  const url = typeof raw === "string" ? raw.trim() : "";
  if (url && !DISCORD_WEBHOOK_PATTERN.test(url)) {
    return { error: "That doesn't look like a Discord webhook URL." };
  }

  await prisma.organization.update({ where: { id: orgId }, data: { discordWebhookUrl: url || null } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: url ? "integration.discord_connected" : "integration.discord_disconnected",
    targetType: "Organization",
    targetId: orgId,
  });

  revalidatePath(`/${orgSlug}/settings/integrations`);
  return { success: url ? "Discord webhook saved." : "Discord webhook removed." };
}

export async function testDiscordWebhookAction(orgId: string): Promise<ActionState> {
  await requirePermission(orgId, Permission.org_settings_manage);

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org?.discordWebhookUrl) return { error: "No webhook configured yet." };

  const result = await sendDiscordWebhook(org.discordWebhookUrl, {
    embeds: [
      {
        title: "Formation is connected",
        description: `Test message from **${org.name}**. Announcements and match results will post here.`,
        color: FORMATION_EMBED_COLOR,
      },
    ],
  });

  return result.ok ? { success: "Test message sent — check your Discord channel." } : { error: result.error };
}
