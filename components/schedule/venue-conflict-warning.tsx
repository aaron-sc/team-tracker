"use client";

import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { formatDateTime } from "@/lib/utils/format-time";

type Conflict = { label: string; scheduledAt: string };

/**
 * Non-blocking heads-up when another match/practice/scrim is already booked at the chosen venue
 * around the chosen time — informational only, never prevents saving. Debounced since it re-fires
 * on every keystroke in the date field.
 */
export function VenueConflictWarning({
  venueId,
  scheduledAt,
  durationMinutes,
  excludeMatchId,
  excludePracticeId,
}: {
  venueId: string;
  scheduledAt: string;
  durationMinutes: number;
  excludeMatchId?: string;
  excludePracticeId?: string;
}) {
  const [conflicts, setConflicts] = useState<{ venueName: string; venueTimezone: string; items: Conflict[] } | null>(null);

  useEffect(() => {
    // The caller only mounts this component once venueId + scheduledAt are both set, and
    // unmounts it (discarding this state for free) as soon as either is cleared — so there's no
    // "now-empty" case to react to here, just the debounced fetch for a still-valid pair.
    if (!venueId || !scheduledAt) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      const params = new URLSearchParams({ scheduledAt, durationMinutes: String(durationMinutes) });
      if (excludeMatchId) params.set("excludeMatchId", excludeMatchId);
      if (excludePracticeId) params.set("excludePracticeId", excludePracticeId);
      fetch(`/api/venues/${venueId}/conflicts?${params}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled || !data) return;
          setConflicts({ venueName: data.venueName, venueTimezone: data.venueTimezone, items: data.conflicts ?? [] });
        })
        .catch(() => {});
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [venueId, scheduledAt, durationMinutes, excludeMatchId, excludePracticeId]);

  if (!conflicts || conflicts.items.length === 0) return null;

  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-800 dark:text-amber-400">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
      <span>
        {conflicts.venueName} is already booked for {conflicts.items[0].label} at{" "}
        {formatDateTime(new Date(conflicts.items[0].scheduledAt), conflicts.venueTimezone)}
        {conflicts.items.length > 1 ? ` (and ${conflicts.items.length - 1} more)` : ""}.
      </span>
    </div>
  );
}
