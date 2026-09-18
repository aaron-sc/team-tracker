"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, requireTeamScope } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { Permission } from "@/lib/generated/prisma/enums";
import { parseIcsFile, type ParsedIcsEvent } from "@/lib/calendar/ics-import";
import type { ActionState } from "@/lib/actions/types";

export type ParseIcsState = { error: string } | { events: ParsedIcsEvent[] } | undefined;

/** Step 1: read every uploaded .ics file's raw text and flatten every VEVENT across all of them
 *  into one list for the review step — the "correlate once, apply to the rest" batch the user
 *  asked for is the team/type picked on the review screen, applied uniformly when step 2 creates
 *  a PracticeSession per selected row, rather than a separate mapping per file. */
export async function parseIcsFilesAction(orgId: string, _prev: ParseIcsState, formData: FormData): Promise<ParseIcsState> {
  await requirePermission(orgId, Permission.practice_create);

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one .ics file." };

  const events: ParsedIcsEvent[] = [];
  for (const file of files) {
    const text = await file.text();
    events.push(...parseIcsFile(text, file.name));
  }

  if (events.length === 0) return { error: "No events found in the uploaded file(s)." };
  return { events };
}

export async function importIcsSessionsAction(orgSlug: string, orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.practice_create);

  const teamId = formData.get("teamId");
  const type = formData.get("type");
  const eventTypeId = formData.get("eventTypeId");
  const eventsRaw = formData.get("events");
  if (typeof teamId !== "string" || !teamId) return { error: "Choose a team." };
  if (type !== "PRACTICE" && type !== "SCRIM" && type !== "EVENT") return { error: "Invalid type." };
  if (typeof eventsRaw !== "string") return { error: "No events to import." };

  let selected: { title: string; start: string; durationMinutes: number }[];
  try {
    selected = JSON.parse(eventsRaw);
  } catch {
    return { error: "Invalid event data." };
  }
  if (!Array.isArray(selected) || selected.length === 0) return { error: "Select at least one event to import." };

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.orgId !== orgId) return { error: "Team not found." };
  requireTeamScope(membership, team.id);

  let trackAttendance = true;
  let resolvedEventTypeId: string | null = null;
  if (type === "EVENT") {
    if (typeof eventTypeId !== "string" || !eventTypeId) return { error: "Choose an event type." };
    const eventType = await prisma.eventType.findUnique({ where: { id: eventTypeId } });
    if (!eventType || eventType.orgId !== orgId) return { error: "Choose an event type." };
    resolvedEventTypeId = eventType.id;
    trackAttendance = eventType.trackAttendance;
  }

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const roster = trackAttendance
    ? await prisma.teamMembership.findMany({ where: { teamId: team.id }, select: { membershipId: true } })
    : [];

  // Bulk-imported history/schedule doesn't fire the usual "new session" in-app notifications or
  // Discord notify-on-create — those are for a manager announcing one new thing, not backfilling
  // a season's worth of practices at once.
  const created = await prisma.$transaction(
    selected.map((e) =>
      prisma.practiceSession.create({
        data: {
          teamId: team.id,
          type,
          eventTypeId: resolvedEventTypeId,
          scheduledAt: fromZonedTime(e.start, org.timezone),
          durationMinutes: Math.max(15, Math.min(600, Math.round(e.durationMinutes) || 60)),
          timezone: org.timezone,
          locationType: "ONLINE",
          notes: e.title,
          createdById: membership.membershipId,
          attendances: trackAttendance ? { create: roster.map((r) => ({ membershipId: r.membershipId })) } : undefined,
        },
      }),
    ),
  );

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "practice.ics_imported",
    targetType: "Team",
    targetId: team.id,
    metadata: { count: created.length, type },
  });

  revalidatePath(`/${orgSlug}/schedule`);
  redirect(`/${orgSlug}/schedule`);
}
