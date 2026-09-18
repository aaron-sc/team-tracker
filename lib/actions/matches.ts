"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission, requireMembership, requireTeamScope } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { matchSchema, matchResultSchema } from "@/lib/validations/match";
import { attendanceStatusSchema } from "@/lib/validations/practice";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";
import { notifyDiscord, FORMATION_EMBED_COLOR, roleMentionPrefix } from "@/lib/integrations/discord";
import { formatDateTime } from "@/lib/utils/format-time";
import { getBaseUrl } from "@/lib/utils/base-url";
import { createNotification } from "@/lib/notifications/create";

async function resolveOpponent(orgId: string, opponentId: string, newOpponentName: string): Promise<string | null> {
  if (opponentId) return opponentId;
  if (!newOpponentName) return null;
  const opponent = await prisma.opponent.create({ data: { orgId, name: newOpponentName } });
  return opponent.id;
}

export async function createMatchAction(orgSlug: string, orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.match_create);

  const parsed = matchSchema.safeParse({
    teamId: formData.get("teamId"),
    opponentId: formData.get("opponentId") ?? "",
    newOpponentName: formData.get("newOpponentName") ?? "",
    scheduledAt: formData.get("scheduledAt"),
    format: formData.get("format"),
    locationType: formData.get("locationType"),
    venueId: formData.get("venueId") ?? "",
    isStreamed: formData.get("isStreamed") === "on",
    streamPlatform: formData.get("streamPlatform") ?? "",
    streamUrl: formData.get("streamUrl") ?? "",
    casterName: formData.get("casterName") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const team = await prisma.team.findUnique({ where: { id: parsed.data.teamId } });
  if (!team || team.orgId !== orgId) return { error: "Team not found." };
  requireTeamScope(membership, team.id);

  const opponentId = await resolveOpponent(orgId, parsed.data.opponentId ?? "", parsed.data.newOpponentName ?? "");
  if (!opponentId) return { error: "Choose an opponent or enter a new one." };

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const roster = await prisma.teamMembership.findMany({ where: { teamId: team.id }, select: { membershipId: true } });

  const match = await prisma.match.create({
    data: {
      teamId: parsed.data.teamId,
      opponentId,
      scheduledAt: fromZonedTime(parsed.data.scheduledAt, org.timezone),
      timezone: org.timezone,
      format: parsed.data.format,
      locationType: parsed.data.locationType,
      venueId: parsed.data.locationType === "LAN" ? parsed.data.venueId || null : null,
      isStreamed: parsed.data.isStreamed,
      streamPlatform: parsed.data.isStreamed ? parsed.data.streamPlatform || null : null,
      streamUrl: parsed.data.isStreamed ? parsed.data.streamUrl || null : null,
      casterName: parsed.data.isStreamed ? parsed.data.casterName || null : null,
      notes: parsed.data.notes || null,
      createdById: membership.membershipId,
      attendances: { create: roster.map((r) => ({ membershipId: r.membershipId })) },
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "match.created",
    targetType: "Match",
    targetId: match.id,
    metadata: { teamId: team.id },
  });

  await Promise.all(
    roster
      .filter((r) => r.membershipId !== membership.membershipId)
      .map((r) =>
        createNotification({
          membershipId: r.membershipId,
          type: "match_created",
          title: `New match scheduled for ${team.name}`,
          linkUrl: `/${orgSlug}/schedule/matches/${match.id}`,
        }),
      ),
  );

  if (team.discordNotifyOnCreate) {
    const opponent = await prisma.opponent.findUnique({ where: { id: opponentId }, select: { name: true } });
    await notifyDiscord(team.discordWebhookUrl, {
      content: `${roleMentionPrefix(team.discordMentionRoleId)}**${team.name}** — new match scheduled vs ${opponent?.name ?? "TBD"}.`,
      embeds: [
        {
          title: `${team.name} vs ${opponent?.name ?? "TBD"}`,
          color: FORMATION_EMBED_COLOR,
          fields: [{ name: "When", value: formatDateTime(match.scheduledAt, org.timezone), inline: true }],
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }

  revalidatePath(`/${orgSlug}/schedule`);
  redirect(`/${orgSlug}/schedule/matches/${match.id}`);
}

export async function updateMatchAction(
  orgSlug: string,
  orgId: string,
  matchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.match_edit);

  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { team: true } });
  if (!match || match.team.orgId !== orgId) return { error: "Match not found." };
  requireTeamScope(membership, match.teamId);

  const parsed = matchSchema.safeParse({
    teamId: formData.get("teamId") ?? match.teamId,
    opponentId: formData.get("opponentId") ?? "",
    newOpponentName: formData.get("newOpponentName") ?? "",
    scheduledAt: formData.get("scheduledAt"),
    format: formData.get("format"),
    locationType: formData.get("locationType"),
    venueId: formData.get("venueId") ?? "",
    isStreamed: formData.get("isStreamed") === "on",
    streamPlatform: formData.get("streamPlatform") ?? "",
    streamUrl: formData.get("streamUrl") ?? "",
    casterName: formData.get("casterName") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const opponentId = await resolveOpponent(orgId, parsed.data.opponentId ?? "", parsed.data.newOpponentName ?? "");
  if (!opponentId) return { error: "Choose an opponent or enter a new one." };

  const newScheduledAt = fromZonedTime(parsed.data.scheduledAt, match.timezone);
  const rescheduled = newScheduledAt.getTime() !== match.scheduledAt.getTime();

  await prisma.match.update({
    where: { id: matchId },
    data: {
      opponentId,
      scheduledAt: newScheduledAt,
      format: parsed.data.format,
      locationType: parsed.data.locationType,
      venueId: parsed.data.locationType === "LAN" ? parsed.data.venueId || null : null,
      isStreamed: parsed.data.isStreamed,
      streamPlatform: parsed.data.isStreamed ? parsed.data.streamPlatform || null : null,
      streamUrl: parsed.data.isStreamed ? parsed.data.streamUrl || null : null,
      casterName: parsed.data.isStreamed ? parsed.data.casterName || null : null,
      notes: parsed.data.notes || null,
      sentReminderMinutes: rescheduled ? Prisma.JsonNull : undefined,
    },
  });

  revalidatePath(`/${orgSlug}/schedule`);
  redirect(`/${orgSlug}/schedule/matches/${matchId}`);
}

export async function recordMatchResultAction(
  orgSlug: string,
  orgId: string,
  matchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.match_result_record);

  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { team: true, opponent: true } });
  if (!match || match.team.orgId !== orgId) return { error: "Match not found." };
  requireTeamScope(membership, match.teamId);

  const parsed = matchResultSchema.safeParse({
    status: formData.get("status"),
    resultStatus: formData.get("resultStatus") ?? "",
    scoreFor: formData.get("scoreFor") ?? "",
    scoreAgainst: formData.get("scoreAgainst") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      status: parsed.data.status,
      resultStatus: parsed.data.resultStatus || null,
      scoreFor: parsed.data.scoreFor === "" || parsed.data.scoreFor === undefined ? null : parsed.data.scoreFor,
      scoreAgainst:
        parsed.data.scoreAgainst === "" || parsed.data.scoreAgainst === undefined ? null : parsed.data.scoreAgainst,
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "match.result_recorded",
    targetType: "Match",
    targetId: matchId,
    metadata: { status: parsed.data.status, resultStatus: parsed.data.resultStatus },
  });

  if (parsed.data.status === "CANCELLED" && match.createdById !== membership.membershipId) {
    await createNotification({
      membershipId: match.createdById,
      type: "match_cancelled",
      title: `${match.team.name} vs ${match.opponent.name} was cancelled`,
      linkUrl: `/${orgSlug}/schedule/matches/${matchId}`,
    }).catch(() => {});
  }

  if (parsed.data.status === "COMPLETED" && parsed.data.resultStatus) {
    let webhookUrl: string | null | undefined = match.team.discordWebhookUrl;
    const mentionRoleId: string | null = match.team.discordWebhookUrl ? match.team.discordMentionRoleId : null;
    if (!webhookUrl) {
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { discordWebhookUrl: true } });
      webhookUrl = org?.discordWebhookUrl;
    }
    const resultLabel = { WIN: "🏆 Win", LOSS: "❌ Loss", DRAW: "🤝 Draw" }[parsed.data.resultStatus];
    const score =
      typeof parsed.data.scoreFor === "number" && typeof parsed.data.scoreAgainst === "number"
        ? `${parsed.data.scoreFor} - ${parsed.data.scoreAgainst}`
        : undefined;
    const baseUrl = await getBaseUrl();
    await notifyDiscord(webhookUrl, {
      content: roleMentionPrefix(mentionRoleId) || undefined,
      embeds: [
        {
          title: `${match.team.name} vs ${match.opponent.name}: ${resultLabel}`,
          url: `${baseUrl}/${orgSlug}/schedule/matches/${matchId}`,
          description: score ? `Final score: **${score}**` : undefined,
          color:
            parsed.data.resultStatus === "WIN" ? 0x22c55e : parsed.data.resultStatus === "LOSS" ? 0xef4444 : FORMATION_EMBED_COLOR,
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }

  revalidatePath(`/${orgSlug}/schedule`);
  revalidatePath(`/${orgSlug}/schedule/matches/${matchId}`);
}

export async function duplicateMatchAction(orgSlug: string, orgId: string, matchId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.match_create);

  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { team: true } });
  if (!match || match.team.orgId !== orgId) return { error: "Match not found." };
  requireTeamScope(membership, match.teamId);

  const roster = await prisma.teamMembership.findMany({ where: { teamId: match.teamId }, select: { membershipId: true } });
  const nextWeek = new Date(match.scheduledAt.getTime() + 7 * 24 * 60 * 60 * 1000);

  const copy = await prisma.match.create({
    data: {
      teamId: match.teamId,
      opponentId: match.opponentId,
      scheduledAt: nextWeek,
      timezone: match.timezone,
      format: match.format,
      locationType: match.locationType,
      venueId: match.venueId,
      isStreamed: match.isStreamed,
      streamPlatform: match.streamPlatform,
      streamUrl: match.streamUrl,
      casterName: match.casterName,
      notes: match.notes,
      createdById: membership.membershipId,
      attendances: { create: roster.map((r) => ({ membershipId: r.membershipId })) },
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "match.duplicated",
    targetType: "Match",
    targetId: copy.id,
    metadata: { sourceMatchId: matchId },
  });

  revalidatePath(`/${orgSlug}/schedule`);
  redirect(`/${orgSlug}/schedule/matches/${copy.id}`);
}

export async function deleteMatchAction(orgSlug: string, orgId: string, matchId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.match_delete);

  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { team: true } });
  if (!match || match.team.orgId !== orgId) return { error: "Match not found." };
  requireTeamScope(membership, match.teamId);

  await prisma.match.delete({ where: { id: matchId } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "match.deleted",
    targetType: "Match",
    targetId: matchId,
    metadata: {},
  });

  revalidatePath(`/${orgSlug}/schedule`);
  redirect(`/${orgSlug}/schedule`);
}

/** A member updating their own RSVP only needs org membership, not attendance_manage — same bar
 *  as practice-sessions.ts's respondToAttendanceAction. */
export async function respondToMatchAttendanceAction(
  orgSlug: string,
  orgId: string,
  attendanceId: string,
  status: string,
): Promise<ActionState> {
  const { membership } = await requireMembership(orgId);

  const parsedStatus = attendanceStatusSchema.safeParse(status);
  if (!parsedStatus.success) return { error: "Invalid status." };

  const attendance = await prisma.matchAttendance.findUnique({ where: { id: attendanceId } });
  if (!attendance) return { error: "Not found." };
  if (attendance.membershipId !== membership.membershipId) {
    return { error: "You can only update your own attendance." };
  }

  await prisma.matchAttendance.update({
    where: { id: attendanceId },
    data: { status: parsedStatus.data, respondedAt: new Date() },
  });

  revalidatePath(`/${orgSlug}/schedule/matches/${attendance.matchId}`);
}

/** Coaches/captains updating attendance on behalf of others. */
export async function manageMatchAttendanceAction(
  orgSlug: string,
  orgId: string,
  attendanceId: string,
  status: string,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.attendance_manage);

  const parsedStatus = attendanceStatusSchema.safeParse(status);
  if (!parsedStatus.success) return { error: "Invalid status." };

  const attendance = await prisma.matchAttendance.findUnique({
    where: { id: attendanceId },
    include: { match: { include: { team: true } } },
  });
  if (!attendance || attendance.match.team.orgId !== orgId) return { error: "Not found." };
  requireTeamScope(membership, attendance.match.teamId);

  await prisma.matchAttendance.update({
    where: { id: attendanceId },
    data: { status: parsedStatus.data, respondedAt: new Date() },
  });

  revalidatePath(`/${orgSlug}/schedule/matches/${attendance.matchId}`);
}

/** Adds someone from the team's current roster to this match's attendance list — for a
 *  substitute, or anyone who joined the roster after the match was originally created (the
 *  attendance list is only auto-populated once, at creation time). Rejects anyone not actually
 *  on the team's roster; upserts so re-adding someone already on the list is a harmless no-op. */
export async function addMatchAttendeeAction(
  orgSlug: string,
  orgId: string,
  matchId: string,
  targetMembershipId: string,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.attendance_manage);

  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { team: true } });
  if (!match || match.team.orgId !== orgId) return { error: "Match not found." };
  requireTeamScope(membership, match.teamId);

  const onRoster = await prisma.teamMembership.findFirst({ where: { teamId: match.teamId, membershipId: targetMembershipId } });
  if (!onRoster) return { error: "That person isn't on this team's roster." };

  await prisma.matchAttendance.upsert({
    where: { matchId_membershipId: { matchId, membershipId: targetMembershipId } },
    create: { matchId, membershipId: targetMembershipId },
    update: {},
  });

  revalidatePath(`/${orgSlug}/schedule/matches/${matchId}`);
  return { success: "Added." };
}

/** Removes someone from this match's attendance list without touching their spot on the team's
 *  actual roster — for someone benched or unavailable for this one match specifically. */
export async function removeMatchAttendeeAction(orgSlug: string, orgId: string, attendanceId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.attendance_manage);

  const attendance = await prisma.matchAttendance.findUnique({ where: { id: attendanceId }, include: { match: { include: { team: true } } } });
  if (!attendance || attendance.match.team.orgId !== orgId) return { error: "Not found." };
  requireTeamScope(membership, attendance.match.teamId);

  await prisma.matchAttendance.delete({ where: { id: attendanceId } });

  revalidatePath(`/${orgSlug}/schedule/matches/${attendance.matchId}`);
  return { success: "Removed." };
}
