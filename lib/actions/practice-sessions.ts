"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, requireMembership } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { practiceSessionSchema, attendanceStatusSchema } from "@/lib/validations/practice";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

async function resolveOpponent(orgId: string, opponentId: string, newOpponentName: string): Promise<string | null> {
  if (opponentId) return opponentId;
  if (!newOpponentName) return null;
  const opponent = await prisma.opponent.create({ data: { orgId, name: newOpponentName } });
  return opponent.id;
}

function parseSessionForm(formData: FormData) {
  return practiceSessionSchema.safeParse({
    teamId: formData.get("teamId"),
    type: formData.get("type"),
    opponentId: formData.get("opponentId") ?? "",
    newOpponentName: formData.get("newOpponentName") ?? "",
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes") || 60,
    locationType: formData.get("locationType"),
    venueId: formData.get("venueId") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

export async function createPracticeSessionAction(
  orgSlug: string,
  orgId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.practice_create);

  const parsed = parseSessionForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const team = await prisma.team.findUnique({ where: { id: parsed.data.teamId } });
  if (!team || team.orgId !== orgId) return { error: "Team not found." };

  let opponentId: string | null = null;
  if (parsed.data.type === "SCRIM") {
    opponentId = await resolveOpponent(orgId, parsed.data.opponentId ?? "", parsed.data.newOpponentName ?? "");
    if (!opponentId) return { error: "Choose an opponent for a scrim." };
  }

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const roster = await prisma.teamMembership.findMany({ where: { teamId: team.id }, select: { membershipId: true } });

  const session = await prisma.practiceSession.create({
    data: {
      teamId: team.id,
      type: parsed.data.type,
      opponentId,
      scheduledAt: new Date(parsed.data.scheduledAt),
      durationMinutes: parsed.data.durationMinutes,
      timezone: org.timezone,
      locationType: parsed.data.locationType,
      venueId: parsed.data.locationType === "LAN" ? parsed.data.venueId || null : null,
      notes: parsed.data.notes || null,
      createdById: membership.membershipId,
      attendances: { create: roster.map((r) => ({ membershipId: r.membershipId })) },
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "practice.created",
    targetType: "PracticeSession",
    targetId: session.id,
    metadata: { teamId: team.id, type: parsed.data.type },
  });

  revalidatePath(`/${orgSlug}/schedule`);
  redirect(`/${orgSlug}/schedule/practice/${session.id}`);
}

export async function updatePracticeSessionAction(
  orgSlug: string,
  orgId: string,
  sessionId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission(orgId, Permission.practice_edit);

  const session = await prisma.practiceSession.findUnique({ where: { id: sessionId }, include: { team: true } });
  if (!session || session.team.orgId !== orgId) return { error: "Session not found." };

  const parsed = parseSessionForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let opponentId: string | null = null;
  if (parsed.data.type === "SCRIM") {
    opponentId = await resolveOpponent(orgId, parsed.data.opponentId ?? "", parsed.data.newOpponentName ?? "");
    if (!opponentId) return { error: "Choose an opponent for a scrim." };
  }

  await prisma.practiceSession.update({
    where: { id: sessionId },
    data: {
      type: parsed.data.type,
      opponentId,
      scheduledAt: new Date(parsed.data.scheduledAt),
      durationMinutes: parsed.data.durationMinutes,
      locationType: parsed.data.locationType,
      venueId: parsed.data.locationType === "LAN" ? parsed.data.venueId || null : null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath(`/${orgSlug}/schedule`);
  redirect(`/${orgSlug}/schedule/practice/${sessionId}`);
}

export async function duplicatePracticeSessionAction(orgSlug: string, orgId: string, sessionId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.practice_create);

  const session = await prisma.practiceSession.findUnique({ where: { id: sessionId }, include: { team: true } });
  if (!session || session.team.orgId !== orgId) return { error: "Session not found." };

  const roster = await prisma.teamMembership.findMany({ where: { teamId: session.teamId }, select: { membershipId: true } });
  const nextWeek = new Date(session.scheduledAt.getTime() + 7 * 24 * 60 * 60 * 1000);

  const copy = await prisma.practiceSession.create({
    data: {
      teamId: session.teamId,
      type: session.type,
      opponentId: session.opponentId,
      scheduledAt: nextWeek,
      durationMinutes: session.durationMinutes,
      timezone: session.timezone,
      locationType: session.locationType,
      venueId: session.venueId,
      notes: session.notes,
      createdById: membership.membershipId,
      attendances: { create: roster.map((r) => ({ membershipId: r.membershipId })) },
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "practice.duplicated",
    targetType: "PracticeSession",
    targetId: copy.id,
    metadata: { sourceSessionId: sessionId },
  });

  revalidatePath(`/${orgSlug}/schedule`);
  redirect(`/${orgSlug}/schedule/practice/${copy.id}`);
}

export async function deletePracticeSessionAction(orgSlug: string, orgId: string, sessionId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.practice_delete);

  const session = await prisma.practiceSession.findUnique({ where: { id: sessionId }, include: { team: true } });
  if (!session || session.team.orgId !== orgId) return { error: "Session not found." };

  await prisma.practiceSession.delete({ where: { id: sessionId } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "practice.deleted",
    targetType: "PracticeSession",
    targetId: sessionId,
    metadata: {},
  });

  revalidatePath(`/${orgSlug}/schedule`);
  redirect(`/${orgSlug}/schedule`);
}

/** A member updating their own RSVP only needs org membership, not attendance_manage. */
export async function respondToAttendanceAction(
  orgSlug: string,
  orgId: string,
  attendanceId: string,
  status: string,
): Promise<ActionState> {
  const { membership } = await requireMembership(orgId);

  const parsedStatus = attendanceStatusSchema.safeParse(status);
  if (!parsedStatus.success) return { error: "Invalid status." };

  const attendance = await prisma.sessionAttendance.findUnique({ where: { id: attendanceId } });
  if (!attendance) return { error: "Not found." };
  if (attendance.membershipId !== membership.membershipId) {
    return { error: "You can only update your own attendance." };
  }

  await prisma.sessionAttendance.update({
    where: { id: attendanceId },
    data: { status: parsedStatus.data, respondedAt: new Date() },
  });

  revalidatePath(`/${orgSlug}/schedule`);
}

/** Coaches/captains updating attendance on behalf of others. */
export async function manageAttendanceAction(
  orgSlug: string,
  orgId: string,
  attendanceId: string,
  status: string,
): Promise<ActionState> {
  await requirePermission(orgId, Permission.attendance_manage);

  const parsedStatus = attendanceStatusSchema.safeParse(status);
  if (!parsedStatus.success) return { error: "Invalid status." };

  const attendance = await prisma.sessionAttendance.findUnique({ where: { id: attendanceId } });
  if (!attendance) return { error: "Not found." };

  await prisma.sessionAttendance.update({
    where: { id: attendanceId },
    data: { status: parsedStatus.data, respondedAt: new Date() },
  });

  revalidatePath(`/${orgSlug}/schedule`);
}
