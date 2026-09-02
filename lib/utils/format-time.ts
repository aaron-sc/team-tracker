import { toZonedTime } from "date-fns-tz";

// Node's Intl.DateTimeFormat rejects `dateStyle`/`timeStyle` combined with `timeZoneName`
// ("Invalid option : option"), so formats that need a zone abbreviation use explicit field
// options instead — those combine with `timeZoneName` fine.

/**
 * Absolute instant → "Aug 15, 2026, 6:00 PM PDT" in the given IANA zone (or "18:00 PDT" with
 * `hour12: false`). Default is 12-hour — pass the viewer's `session.user.timeFormat !== "24h"`
 * explicitly wherever it's known, so their preference is respected instead of the default.
 */
export function formatDateTime(date: Date, timeZone: string, hour12 = true): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12,
    timeZoneName: "short",
    timeZone,
  }).format(date);
}

/** Absolute instant → "Friday, August 15, 2026 at 6:00 PM PDT" (or 24h "at 18:00 PDT"). */
export function formatDateTimeLong(date: Date, timeZone: string, hour12 = true): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12,
    timeZoneName: "short",
    timeZone,
  }).format(date);
}

/** Absolute instant → "6:00 PM PDT" (or 24h "18:00 PDT"). */
export function formatTime(date: Date, timeZone: string, hour12 = true): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12,
    timeZoneName: "short",
    timeZone,
  }).format(date);
}

/** Absolute instant → "6:00 PM" (or 24h "18:00") — no zone abbreviation, for dense lists where
 *  the zone is implied by context. */
export function formatTimeShort(date: Date, timeZone: string, hour12 = true): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12, timeZone }).format(date);
}

/** Absolute instant → "Aug 15, 6:00 PM" (or 24h "Aug 15, 18:00") — no year, no zone abbreviation,
 *  for dense lists where the zone is implied by context. */
export function formatDateTimeShort(date: Date, timeZone: string, hour12 = true): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12,
    timeZone,
  }).format(date);
}

/** Absolute instant → "Aug 15, 2026" (date portion only, in the given zone) */
export function formatDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone }).format(date);
}

/** A pure calendar date stored at UTC midnight (no real-world timezone attached) → "Aug 15, 2026" */
export function formatCalendarDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

/** Absolute instant → "YYYY-MM-DDTHH:mm" wall-clock value for a `datetime-local` input, in the given zone. */
export function toDatetimeLocalValue(date: Date, timeZone: string): string {
  const zoned = toZonedTime(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${zoned.getFullYear()}-${pad(zoned.getMonth() + 1)}-${pad(zoned.getDate())}T${pad(zoned.getHours())}:${pad(zoned.getMinutes())}`;
}

/** "HH:mm" wall-clock string (no date/zone attached, e.g. an availability rule's stored time) →
 *  "6:00 PM", or with `hour12: false` → "18:00". */
export function formatWallClockTime(time: string, hour12 = true): string {
  const [h, m] = time.split(":").map(Number);
  if (!hour12) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Timezone-aware replacement for date-fns `isSameDay` — compares calendar day within a given zone. */
export function isSameDayInTz(a: Date, b: Date, timeZone: string): boolean {
  const za = toZonedTime(a, timeZone);
  const zb = toZonedTime(b, timeZone);
  return za.getFullYear() === zb.getFullYear() && za.getMonth() === zb.getMonth() && za.getDate() === zb.getDate();
}
