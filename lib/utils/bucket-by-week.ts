import "server-only";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function mondayStart(d: Date): Date {
  const dayOfWeek = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dayOfWeek));
}

/** Monday-start ISO week bucketing for simple signup-trend charts — used by admin-stats routes.
 *  Returns exactly `weeks` entries, oldest first, each week represented even if its count is 0, so
 *  a chart built from this always has a consistent, gap-free x-axis. Buckets by comparing each
 *  date's own Monday-aligned week start against this week's start, rather than the raw
 *  timestamps — comparing raw timestamps would produce a negative (and therefore wrongly-floored)
 *  difference for anything later in the current week than "now" happens to be. */
export function bucketByWeek(dates: Date[], weeks: number): { weekStart: string; count: number }[] {
  const thisWeekStart = mondayStart(new Date());

  const buckets: { weekStart: string; count: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeekStart.getTime() - i * WEEK_MS);
    buckets.push({ weekStart: start.toISOString().slice(0, 10), count: 0 });
  }

  for (const date of dates) {
    const weeksAgo = Math.round((thisWeekStart.getTime() - mondayStart(date).getTime()) / WEEK_MS);
    const index = weeks - 1 - weeksAgo;
    if (index >= 0 && index < buckets.length) buckets[index].count += 1;
  }

  return buckets;
}
