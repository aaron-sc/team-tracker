import { toZonedTime } from "date-fns-tz";

/** 0 = Sunday … 6 = Saturday, matching AvailabilityRule.dayOfWeek. */
export function dayOfWeekInTz(instant: Date, timeZone: string): number {
  return toZonedTime(instant, timeZone).getDay();
}

/** "HH:mm" wall-clock time of an absolute instant in the given IANA timezone. */
export function wallTimeInTz(instant: Date, timeZone: string): string {
  const zoned = toZonedTime(instant, timeZone);
  const hours = String(zoned.getHours()).padStart(2, "0");
  const minutes = String(zoned.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** "HH:mm" wall-clock time `minutes` after an absolute instant, in the given timezone. */
export function wallTimeAfterInTz(instant: Date, minutes: number, timeZone: string): string {
  return wallTimeInTz(new Date(instant.getTime() + minutes * 60 * 1000), timeZone);
}

/** Compares "HH:mm" strings lexicographically — valid since they're zero-padded. */
export function timeLte(a: string, b: string): boolean {
  return a <= b;
}

export function dateOnlyUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
