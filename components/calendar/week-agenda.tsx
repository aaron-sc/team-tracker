import { eachDayOfInterval, endOfWeek, format, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { EventChip } from "@/components/calendar/event-chip";
import { isSameDayInTz } from "@/lib/utils/format-time";
import type { CalendarEvent } from "@/lib/calendar/types";

export function WeekAgenda({ week, events, timeZone }: { week: Date; events: CalendarEvent[]; timeZone: string }) {
  const days = eachDayOfInterval({ start: startOfWeek(week), end: endOfWeek(week) });
  const today = new Date();

  return (
    <div className="grid gap-3 sm:grid-cols-7">
      {days.map((day) => {
        const dayEvents = events
          .filter((e) => isSameDayInTz(e.start, day, timeZone))
          .sort((a, b) => a.start.getTime() - b.start.getTime());

        return (
          <div key={day.toISOString()} className="rounded-lg border p-2">
            <div
              className={cn(
                "mb-2 text-sm font-medium",
                isSameDayInTz(day, today, timeZone) && "text-primary",
              )}
            >
              {format(day, "EEE d")}
            </div>
            <div className="space-y-1">
              {dayEvents.map((event) => (
                <EventChip key={event.id} event={event} timeZone={timeZone} className="block whitespace-normal" />
              ))}
              {dayEvents.length === 0 ? <p className="text-xs text-muted-foreground">—</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
