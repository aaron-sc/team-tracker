"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { matchSchema, matchResultSchema } from "@/lib/validations/match";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

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

  const opponentId = await resolveOpponent(orgId, parsed.data.opponentId ?? "", parsed.data.newOpponentName ?? "");
  if (!opponentId) return { error: "Choose an opponent or enter a new one." };

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });

  const match = await prisma.match.create({
    data: {
      teamId: parsed.data.teamId,
      opponentId,
      scheduledAt: new Date(parsed.data.scheduledAt),
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
  await requirePermission(orgId, Permission.match_edit);

  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { team: true } });
  if (!match || match.team.orgId !== orgId) return { error: "Match not found." };

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

  await prisma.match.update({
    where: { id: matchId },
    data: {
      opponentId,
      scheduledAt: new Date(parsed.data.scheduledAt),
      format: parsed.data.format,
      locationType: parsed.data.locationType,
      venueId: parsed.data.locationType === "LAN" ? parsed.data.venueId || null : null,
      isStreamed: parsed.data.isStreamed,
      streamPlatform: parsed.data.isStreamed ? parsed.data.streamPlatform || null : null,
      streamUrl: parsed.data.isStreamed ? parsed.data.streamUrl || null : null,
      casterName: parsed.data.isStreamed ? parsed.data.casterName || null : null,
      notes: parsed.data.notes || null,
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

  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { team: true } });
  if (!match || match.team.orgId !== orgId) return { error: "Match not found." };

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

  revalidatePath(`/${orgSlug}/schedule`);
  revalidatePath(`/${orgSlug}/schedule/matches/${matchId}`);
}

export async function deleteMatchAction(orgSlug: string, orgId: string, matchId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.match_delete);

  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { team: true } });
  if (!match || match.team.orgId !== orgId) return { error: "Match not found." };

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
