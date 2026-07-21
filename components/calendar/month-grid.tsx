import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { EventChip } from "@/components/calendar/event-chip";
import type { CalendarEvent } from "@/lib/calendar/types";

const MAX_VISIBLE = 3;

export function MonthGrid({ month, events, today }: { month: Date; events: CalendarEvent[]; today: Date }) {
  const start = startOfWeek(startOfMonth(month));
  const end = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2 py-1.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = events
            .filter((e) => isSameDay(e.start, day))
            .sort((a, b) => a.start.getTime() - b.start.getTime());
          const visible = dayEvents.slice(0, MAX_VISIBLE);
          const overflow = dayEvents.length - visible.length;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-24 space-y-1 border-b border-r p-1.5 last:border-r-0",
                !isSameMonth(day, month) && "bg-muted/20 text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "text-xs",
                  isSameDay(day, today) && "flex size-5 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </div>
              {visible.map((event) => (
                <EventChip key={event.id} event={event} />
              ))}
              {overflow > 0 ? <p className="px-1.5 text-xs text-muted-foreground">+{overflow} more</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
