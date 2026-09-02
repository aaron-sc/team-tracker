"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Slot = { dayOfWeek: number; startTime: string; endTime: string; count: number };

function formatSlotTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${period}`;
}

/** Next date (today or later) on `dayOfWeek`, as a "YYYY-MM-DDTHH:mm" datetime-local value at
 *  `time` — the value is a wall-clock string interpreted in the org's timezone by the server on
 *  submit, same as any other date typed into this form, so no timezone math is needed here. */
function nextOccurrenceValue(dayOfWeek: number, time: string): string {
  const now = new Date();
  const diff = (dayOfWeek - now.getDay() + 7) % 7;
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${time}`;
}

/**
 * Fetches a team's best recurring availability windows and offers them as one-click picks that
 * fill in the scheduled-time field, via the same event-dispatch trick DateField's own "Today"
 * button uses — avoids needing to convert the whole form to controlled state just for this.
 */
export function SuggestedTimesPanel({
  teamId,
  scheduledAtInputId,
}: {
  teamId: string;
  scheduledAtInputId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [rosterSize, setRosterSize] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([]);

  useEffect(() => {
    // No synchronous setLoading(true) here on purpose — this component is remounted (via a
    // `key={teamId}` from its caller) whenever the team changes, so `loading` already starts
    // true from the useState initializer above for each team.
    if (!teamId) return;
    let cancelled = false;
    fetch(`/api/availability/teams/${teamId}/overlap`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setRosterSize(data.rosterSize ?? 0);
        setSlots(data.topSlots ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (loading) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Checking team availability…
      </p>
    );
  }

  if (rosterSize === 0 || slots.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles className="size-3.5" />
        Suggested times, based on the team&apos;s recurring availability
      </p>
      <div className="flex flex-wrap gap-1.5">
        {slots.map((slot) => (
          <button
            key={`${slot.dayOfWeek}-${slot.startTime}`}
            type="button"
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs transition-colors hover:bg-accent",
              slot.count === rosterSize ? "border-emerald-500/40 bg-emerald-500/5" : "",
            )}
            onClick={() => {
              const input = document.getElementById(scheduledAtInputId) as HTMLInputElement | null;
              if (!input) return;
              input.value = nextOccurrenceValue(slot.dayOfWeek, slot.startTime);
              input.dispatchEvent(new Event("input", { bubbles: true }));
              input.dispatchEvent(new Event("change", { bubbles: true }));
            }}
          >
            {DAY_LABELS[slot.dayOfWeek]} {formatSlotTime(slot.startTime)}
            <span className="ml-1 text-muted-foreground">
              ({slot.count}/{rosterSize})
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
