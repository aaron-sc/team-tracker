import { eachDayOfInterval, endOfWeek, format, isSameDay, isToday, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { EventChip } from "@/components/calendar/event-chip";
import type { CalendarEvent } from "@/lib/calendar/types";

export function WeekAgenda({ week, events }: { week: Date; events: CalendarEvent[] }) {
  const days = eachDayOfInterval({ start: startOfWeek(week), end: endOfWeek(week) });

  return (
    <div className="grid gap-3 sm:grid-cols-7">
      {days.map((day) => {
        const dayEvents = events
          .filter((e) => isSameDay(e.start, day))
          .sort((a, b) => a.start.getTime() - b.start.getTime());

        return (
          <div key={day.toISOString()} className="rounded-lg border p-2">
            <div
              className={cn(
                "mb-2 text-sm font-medium",
                isToday(day) && "text-primary",
              )}
            >
              {format(day, "EEE d")}
            </div>
            <div className="space-y-1">
              {dayEvents.map((event) => (
                <EventChip key={event.id} event={event} className="block whitespace-normal" />
              ))}
              {dayEvents.length === 0 ? <p className="text-xs text-muted-foreground">—</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
