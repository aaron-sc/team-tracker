import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/calendar/types";
import { formatTimeShort } from "@/lib/utils/format-time";

export function EventChip({ event, timeZone, className }: { event: CalendarEvent; timeZone: string; className?: string }) {
  return (
    <Link
      href={event.href}
      className={cn(
        "block truncate rounded px-1.5 py-0.5 text-xs font-medium transition-colors",
        event.type === "match"
          ? "bg-primary/15 text-primary hover:bg-primary/25"
          : "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-400",
        className,
      )}
      title={event.title}
    >
      {formatTimeShort(event.start, timeZone)} {event.title}
    </Link>
  );
}
