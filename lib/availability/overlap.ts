import "server-only";
import { prisma } from "@/lib/db/prisma";
import { convertWeeklyTime } from "@/lib/utils/availability-tz";

export const SLOTS_PER_DAY = 48; // 30-minute increments across a day

export function timeToSlot(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 2 + (m >= 30 ? 1 : 0);
}

export function slotToTime(slot: number): string {
  const h = Math.floor(slot / 2);
  const m = slot % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
}

export type OverlapGrid = {
  rosterSize: number;
  /** counts[dayOfWeek][slot] = number of distinct roster members available in that half-hour, in org timezone. */
  counts: number[][];
};

/**
 * Builds a week-shaped grid of how many of a team's roster are recurringly available in each
 * half-hour slot, all converted into the org's timezone (each member sets availability in their
 * own). This is the recurring weekly *pattern* — it doesn't account for one-off exceptions on
 * specific dates, which is a deliberate scope: this answers "when does this team usually have
 * people free," not "who's free next Tuesday specifically."
 */
export async function computeTeamAvailabilityOverlap(teamId: string, orgTimezone: string): Promise<OverlapGrid> {
  const roster = await prisma.teamMembership.findMany({ where: { teamId }, select: { membershipId: true } });
  const rosterSize = roster.length;
  const membershipIds = roster.map((r) => r.membershipId);

  const counts: number[][] = Array.from({ length: 7 }, () => Array(SLOTS_PER_DAY).fill(0));
  if (membershipIds.length === 0) return { rosterSize, counts };

  const rules = await prisma.availabilityRule.findMany({ where: { membershipId: { in: membershipIds } } });

  // A member can have multiple overlapping rules; only count each member once per slot.
  const seen = new Set<string>();

  const markRange = (membershipId: string, day: number, fromSlot: number, toSlot: number) => {
    for (let s = fromSlot; s < toSlot; s++) {
      const key = `${membershipId}:${day}:${s}`;
      if (seen.has(key)) continue;
      seen.add(key);
      counts[day][s] += 1;
    }
  };

  for (const rule of rules) {
    const start =
      rule.timezone === orgTimezone
        ? { dayOfWeek: rule.dayOfWeek, time: rule.startTime }
        : convertWeeklyTime(rule.dayOfWeek, rule.startTime, rule.timezone, orgTimezone);
    const end =
      rule.timezone === orgTimezone
        ? { dayOfWeek: rule.dayOfWeek, time: rule.endTime }
        : convertWeeklyTime(rule.dayOfWeek, rule.endTime, rule.timezone, orgTimezone);

    const startSlot = timeToSlot(start.time);
    const endSlot = timeToSlot(end.time);

    if (start.dayOfWeek === end.dayOfWeek && startSlot < endSlot) {
      markRange(rule.membershipId, start.dayOfWeek, startSlot, endSlot);
    } else {
      // Crossed midnight in conversion (or the rule itself wraps) — split across the two days.
      markRange(rule.membershipId, start.dayOfWeek, startSlot, SLOTS_PER_DAY);
      markRange(rule.membershipId, end.dayOfWeek, 0, endSlot);
    }
  }

  return { rosterSize, counts };
}

export type SuggestedSlot = { dayOfWeek: number; startTime: string; endTime: string; count: number };

/**
 * Picks the best 1-hour windows from an overlap grid — highest headcount first, no two
 * suggestions overlapping. `durationSlots` controls the window length (2 = 1 hour).
 */
export function topOverlapSlots(grid: OverlapGrid, limit = 6, durationSlots = 2): SuggestedSlot[] {
  const candidates: SuggestedSlot[] = [];
  for (let day = 0; day < 7; day++) {
    for (let s = 0; s + durationSlots <= SLOTS_PER_DAY; s++) {
      const windowCounts = grid.counts[day].slice(s, s + durationSlots);
      const minCount = Math.min(...windowCounts);
      if (minCount === 0) continue;
      candidates.push({ dayOfWeek: day, startTime: slotToTime(s), endTime: slotToTime(s + durationSlots), count: minCount });
    }
  }

  candidates.sort((a, b) => b.count - a.count);

  const picked: SuggestedSlot[] = [];
  const usedKeys = new Set<string>();
  for (const c of candidates) {
    // Skip windows overlapping an already-picked slot on the same day.
    const startSlot = timeToSlot(c.startTime);
    const key = `${c.dayOfWeek}:${startSlot}`;
    if (usedKeys.has(key)) continue;
    const overlapsExisting = picked.some(
      (p) => p.dayOfWeek === c.dayOfWeek && timeToSlot(p.startTime) < timeToSlot(c.endTime) && timeToSlot(c.startTime) < timeToSlot(p.endTime),
    );
    if (overlapsExisting) continue;
    picked.push(c);
    usedKeys.add(key);
    if (picked.length >= limit) break;
  }

  return picked;
}
