type LabelableSession = {
  type: "PRACTICE" | "SCRIM" | "EVENT";
  opponent?: { name: string } | null;
  eventType?: { name: string } | null;
};

/** "Practice", "Scrim vs Iron Horizon", or a custom event type's name ("Community Event") — the
 *  one place every practice/scrim/event label is built, so a new SessionType only needs handling
 *  here instead of at each of the many call sites that used to duplicate this ternary. */
export function sessionTypeLabel(session: LabelableSession, opts: { lowercase?: boolean } = {}): string {
  if (session.type === "SCRIM") {
    // Only the leading "Scrim"/"scrim" is case-adjusted — the opponent name is a proper noun.
    return `${opts.lowercase ? "scrim" : "Scrim"} vs ${session.opponent?.name ?? "TBD"}`;
  }
  if (session.type === "EVENT") {
    // The event type name is entirely user-defined (e.g. "Community Event") — lowercase the
    // whole thing for inline use the same way "Practice" becomes "practice".
    const label = session.eventType?.name ?? "Event";
    return opts.lowercase ? label.toLowerCase() : label;
  }
  return opts.lowercase ? "practice" : "Practice";
}
