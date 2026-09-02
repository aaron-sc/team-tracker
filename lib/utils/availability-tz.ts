import { fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * Converts a recurring weekly-rule time (a day of week + "HH:mm" wall-clock time, stated in one
 * IANA zone) into the equivalent day/time in another IANA zone. Because a fixed wall-clock time's
 * UTC offset varies through the year (DST), this uses the *next upcoming* occurrence of that
 * weekday as the reference instant — the one that's actually practically relevant — rather than
 * an arbitrary fixed date. The result can land on a different day of week (e.g. 11 PM Monday
 * Pacific is already Tuesday in Chicago) — callers should show the day when it differs from the
 * input, not just the time.
 */
export function convertWeeklyTime(
  dayOfWeek: number,
  time: string,
  fromTz: string,
  toTz: string,
  now: Date = new Date(),
): { dayOfWeek: number; time: string } {
  const zonedNow = toZonedTime(now, fromTz);
  const daysUntil = (dayOfWeek - zonedNow.getDay() + 7) % 7;
  const targetDate = new Date(zonedNow);
  targetDate.setDate(targetDate.getDate() + daysUntil);

  const [h, m] = time.split(":").map(Number);
  const wallClock = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), h, m, 0, 0);
  const instant = fromZonedTime(wallClock, fromTz);

  const converted = toZonedTime(instant, toTz);
  return {
    dayOfWeek: converted.getDay(),
    time: `${String(converted.getHours()).padStart(2, "0")}:${String(converted.getMinutes()).padStart(2, "0")}`,
  };
}
