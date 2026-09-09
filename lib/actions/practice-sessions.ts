"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, requireMembership } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { practiceSessionSchema, attendanceStatusSchema } from "@/lib/validations/practice";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";
import { createNotification } from "@/lib/notifications/create";

async function resolveOpponent(orgId: string, opponentId: string, newOpponentName: string): Promise<string | null> {
  if (opponentId) return opponentId;
  if (!newOpponentName) return null;
  const opponent = await prisma.opponent.create({ data: { orgId, name: newOpponentName } });
  return opponent.id;
}

function parseSessionForm(formData: FormData, fallbackTeamId?: string) {
  return practiceSessionSchema.safeParse({
    teamId: formData.get("teamId") ?? fallbackTeamId,
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

const REPEAT_WEEKS_VALUES = new Set([1, 4, 8, 12]);

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

  const rawRepeatWeeks = Number(formData.get("repeatWeeks") ?? 1);
  const occurrences = REPEAT_WEEKS_VALUES.has(rawRepeatWeeks) ? rawRepeatWeeks : 1;

  const team = await prisma.team.findUnique({ where: { id: parsed.data.teamId } });
  if (!team || team.orgId !== orgId) return { error: "Team not found." };

  let opponentId: string | null = null;
  if (parsed.data.type === "SCRIM") {
    opponentId = await resolveOpponent(orgId, parsed.data.opponentId ?? "", parsed.data.newOpponentName ?? "");
    if (!opponentId) return { error: "Choose an opponent for a scrim." };
  }

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const roster = await prisma.teamMembership.findMany({ where: { teamId: team.id }, select: { membershipId: true } });
  const firstScheduledAt = fromZonedTime(parsed.data.scheduledAt, org.timezone);

  const sessions = await prisma.$transaction(
    Array.from({ length: occurrences }, (_, i) =>
      prisma.practiceSession.create({
        data: {
          teamId: team.id,
          type: parsed.data.type,
          opponentId,
          scheduledAt: new Date(firstScheduledAt.getTime() + i * 7 * 24 * 60 * 60 * 1000),
          durationMinutes: parsed.data.durationMinutes,
          timezone: org.timezone,
          locationType: parsed.data.locationType,
          venueId: parsed.data.locationType === "LAN" ? parsed.data.venueId || null : null,
          notes: parsed.data.notes || null,
          createdById: membership.membershipId,
          attendances: { create: roster.map((r) => ({ membershipId: r.membershipId })) },
        },
      }),
    ),
  );

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "practice.created",
    targetType: "PracticeSession",
    targetId: sessions[0].id,
    metadata: { teamId: team.id, type: parsed.data.type, occurrences },
  });

  await Promise.all(
    roster
      .filter((r) => r.membershipId !== membership.membershipId)
      .map((r) =>
        createNotification({
          membershipId: r.membershipId,
          type: "practice_created",
          title: `New ${parsed.data.type === "SCRIM" ? "scrim" : "practice"} scheduled for ${team.name}`,
          linkUrl: `/${orgSlug}/schedule/practice/${sessions[0].id}`,
        }),
      ),
  );

  revalidatePath(`/${orgSlug}/schedule`);
  if (occurrences > 1) {
    redirect(`/${orgSlug}/schedule`);
  }
  redirect(`/${orgSlug}/schedule/practice/${sessions[0].id}`);
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

  const parsed = parseSessionForm(formData, session.teamId);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let opponentId: string | null = null;
  if (parsed.data.type === "SCRIM") {
    opponentId = await resolveOpponent(orgId, parsed.data.opponentId ?? "", parsed.data.newOpponentName ?? "");
    if (!opponentId) return { error: "Choose an opponent for a scrim." };
  }

  const newScheduledAt = fromZonedTime(parsed.data.scheduledAt, session.timezone);
  const rescheduled = newScheduledAt.getTime() !== session.scheduledAt.getTime();

  await prisma.practiceSession.update({
    where: { id: sessionId },
    data: {
      type: parsed.data.type,
      opponentId,
      scheduledAt: newScheduledAt,
      durationMinutes: parsed.data.durationMinutes,
      locationType: parsed.data.locationType,
      venueId: parsed.data.locationType === "LAN" ? parsed.data.venueId || null : null,
      notes: parsed.data.notes || null,
      reminderSentAt: rescheduled ? null : undefined,
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

  if (session.createdById !== membership.membershipId) {
    await createNotification({
      membershipId: session.createdById,
      type: "practice_cancelled",
      title: `${session.team.name}'s ${session.type === "SCRIM" ? "scrim" : "practice"} was cancelled`,
    }).catch(() => {});
  }

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

  const attendance = await prisma.sessionAttendance.findUnique({
    where: { id: attendanceId },
    include: { session: { include: { team: true } } },
  });
  if (!attendance) return { error: "Not found." };
  if (attendance.membershipId !== membership.membershipId) {
    return { error: "You can only update your own attendance." };
  }

  await prisma.sessionAttendance.update({
    where: { id: attendanceId },
    data: { status: parsedStatus.data, respondedAt: new Date() },
  });

  if (parsedStatus.data === "DECLINED" && attendance.session.createdById !== membership.membershipId) {
    await createNotification({
      membershipId: attendance.session.createdById,
      type: "practice_declined",
      title: `A player can't make ${attendance.session.team.name}'s ${attendance.session.type === "SCRIM" ? "scrim" : "practice"}`,
      linkUrl: `/${orgSlug}/schedule/practice/${attendance.session.id}`,
    }).catch(() => {});
  }

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
