import "server-only";
import { prisma } from "@/lib/db/prisma";
import { dayOfWeekInTz, wallTimeInTz, wallTimeAfterInTz, timeLte, dateOnlyUTC } from "@/lib/availability/tz";
import { toZonedTime } from "date-fns-tz";
import type { AvailabilityRule, AvailabilityException } from "@/lib/generated/prisma/client";

type SessionLike = {
  scheduledAt: Date;
  durationMinutes: number;
  timezone: string;
  attendances: { membershipId: string }[];
};

/**
 * A membership is "unavailable" for a session unless an AvailabilityException
 * explicitly covers it, or an AvailabilityRule window fully contains the
 * session's time range. No rule/exception at all ⇒ conflict (safer default).
 *
 * Rule day-of-week/time comparisons use each rule's own timezone; exception
 * date-matching uses the session's timezone as the reference calendar day —
 * a deliberate MVP simplification documented in the project plan (fully
 * correct per-member exception timezones would need a timezone field on
 * AvailabilityException, which is out of scope for now).
 */
function isAvailable(
  membershipId: string,
  session: SessionLike,
  rules: AvailabilityRule[],
  exceptions: AvailabilityException[],
): boolean {
  const { scheduledAt: start, durationMinutes, timezone } = session;

  const sessionDate = dateOnlyUTC(toZonedTime(start, timezone));
  const exception = exceptions.find(
    (e) => e.membershipId === membershipId && dateOnlyUTC(e.date).getTime() === sessionDate.getTime(),
  );

  if (exception) {
    if (!exception.isAvailable) return false;
    if (exception.startTime && exception.endTime) {
      const startWall = wallTimeInTz(start, timezone);
      const endWall = wallTimeAfterInTz(start, durationMinutes, timezone);
      return timeLte(exception.startTime, startWall) && timeLte(endWall, exception.endTime);
    }
    return true;
  }

  const memberRules = rules.filter((r) => r.membershipId === membershipId);
  for (const rule of memberRules) {
    if (rule.effectiveFrom && start < rule.effectiveFrom) continue;
    if (rule.effectiveUntil && start > rule.effectiveUntil) continue;
    if (rule.dayOfWeek !== dayOfWeekInTz(start, rule.timezone)) continue;

    const startWall = wallTimeInTz(start, rule.timezone);
    const endWall = wallTimeAfterInTz(start, durationMinutes, rule.timezone);
    if (timeLte(rule.startTime, startWall) && timeLte(endWall, rule.endTime)) {
      return true;
    }
  }

  return false;
}

/** Returns the set of membershipIds (from session.attendances) who conflict with this session. */
export async function getConflictsForSession(session: SessionLike): Promise<Set<string>> {
  const membershipIds = session.attendances.map((a) => a.membershipId);
  if (membershipIds.length === 0) return new Set();

  const [rules, exceptions] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { membershipId: { in: membershipIds } } }),
    prisma.availabilityException.findMany({ where: { membershipId: { in: membershipIds } } }),
  ]);

  const conflicts = new Set<string>();
  for (const membershipId of membershipIds) {
    if (!isAvailable(membershipId, session, rules, exceptions)) {
      conflicts.add(membershipId);
    }
  }
  return conflicts;
}
