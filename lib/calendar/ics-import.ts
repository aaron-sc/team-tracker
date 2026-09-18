import "server-only";
import * as ical from "node-ical";

export type ParsedIcsEvent = {
  uid: string;
  sourceFile: string;
  title: string;
  start: string; // ISO instant
  durationMinutes: number;
  location: string | null;
  description: string | null;
};

/** node-ical fields (summary/location/description) come back either as a plain string or as
 *  { params, val } when the ICS line carries parameters (e.g. SUMMARY;LANGUAGE=en:Practice) —
 *  this always gets you the plain text either way. */
function textValue(value: string | { val?: string } | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return value.val ?? null;
}

/** Parses every VEVENT out of one .ics file's raw text. Recurring events (RRULE) are expanded by
 *  node-ical into `recurrences` overrides, but the base event's own `rrule` is left alone here —
 *  turning a whole recurrence series into individual imported sessions is a lot of extra surface
 *  (which instances, how many, DST edge cases) for a first cut, so only the events' own concrete
 *  start/end (or a recurrence override) are imported; a genuinely recurring source event still
 *  imports as a single session at its first occurrence. */
export function parseIcsFile(icsText: string, sourceFile: string): ParsedIcsEvent[] {
  let parsed: ical.CalendarResponse;
  try {
    parsed = ical.sync.parseICS(icsText);
  } catch {
    return [];
  }

  const events: ParsedIcsEvent[] = [];
  for (const key of Object.keys(parsed)) {
    const entry = parsed[key];
    if (!entry || entry.type !== "VEVENT" || !entry.start) continue;
    const item = entry as ical.VEvent;

    const start = item.start;
    const end = item.end;
    const durationMinutes = end
      ? Math.max(15, Math.round((end.getTime() - start.getTime()) / 60_000))
      : 60;

    events.push({
      uid: item.uid || key,
      sourceFile,
      title: textValue(item.summary) || "Untitled event",
      start: start.toISOString(),
      durationMinutes,
      location: textValue(item.location),
      description: textValue(item.description),
    });
  }
  return events.sort((a, b) => a.start.localeCompare(b.start));
}
