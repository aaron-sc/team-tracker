"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSession, requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { Permission } from "@/lib/generated/prisma/enums";
import { listGuildTextChannels, listGuildRoles } from "@/lib/integrations/discord-bot";
import type { ActionState } from "@/lib/actions/types";

/** For the reminder-channel / role-sync pickers on a team's edit page — empty arrays if the bot
 *  isn't connected for this org, which the picker UI treats as "nothing to pick from yet". */
export async function getDiscordGuildOptionsAction(
  orgId: string,
): Promise<{ channels: { id: string; name: string }[]; roles: { id: string; name: string }[] }> {
  await requirePermission(orgId, Permission.team_edit);

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org?.discordGuildId) return { channels: [], roles: [] };

  const [channels, roles] = await Promise.all([listGuildTextChannels(org.discordGuildId), listGuildRoles(org.discordGuildId)]);
  return { channels, roles };
}

function normalizeCode(formData: FormData): string {
  return String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
}

/** Redeems a /link code from Discord, attaching that Discord user to the signed-in Formation account. */
export async function redeemDiscordLinkCodeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const code = normalizeCode(formData);
  if (!code) return { error: "Enter the code shown by /link in Discord." };

  await prisma.discordLinkCode.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  const record = await prisma.discordLinkCode.findUnique({ where: { code } });
  if (!record) return { error: "That code is invalid or has expired — run /link again in Discord." };

  const takenByOther = await prisma.user.findFirst({
    where: { discordUserId: record.discordUserId, id: { not: session.user.id } },
  });
  if (takenByOther) return { error: "That Discord account is already linked to a different Formation account." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { discordUserId: record.discordUserId, discordHandle: record.discordUsername },
  });
  await prisma.discordLinkCode.delete({ where: { code } });

  revalidatePath("/account");
  return { success: `Connected to Discord as ${record.discordUsername}.` };
}

export async function disconnectDiscordAction(): Promise<ActionState> {
  const session = await requireSession();
  await prisma.user.update({ where: { id: session.user.id }, data: { discordUserId: null } });
  revalidatePath("/account");
  return { success: "Discord account disconnected." };
}

/** Redeems a /connect code from Discord, attaching that guild to this org. */
export async function redeemDiscordGuildLinkCodeAction(
  orgSlug: string,
  orgId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.org_settings_manage);
  const code = normalizeCode(formData);
  if (!code) return { error: "Enter the code shown by /connect in Discord." };

  await prisma.discordGuildLinkCode.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  const record = await prisma.discordGuildLinkCode.findUnique({ where: { code } });
  if (!record) return { error: "That code is invalid or has expired — run /connect again in Discord." };

  const takenByOther = await prisma.organization.findFirst({
    where: { discordGuildId: record.guildId, id: { not: orgId } },
  });
  if (takenByOther) return { error: "That Discord server is already connected to a different Formation organization." };

  await prisma.organization.update({ where: { id: orgId }, data: { discordGuildId: record.guildId } });
  await prisma.discordGuildLinkCode.delete({ where: { code } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "org.discord_bot_connected",
    targetType: "Organization",
    targetId: orgId,
    metadata: { guildName: record.guildName },
  });

  revalidatePath(`/${orgSlug}/settings/integrations`);
  return { success: `Connected to "${record.guildName}".` };
}

export async function disconnectDiscordGuildAction(orgSlug: string, orgId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.org_settings_manage);
  await prisma.organization.update({ where: { id: orgId }, data: { discordGuildId: null } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "org.discord_bot_disconnected",
    targetType: "Organization",
    targetId: orgId,
    metadata: {},
  });

  revalidatePath(`/${orgSlug}/settings/integrations`);
  return { success: "Discord bot disconnected." };
}
