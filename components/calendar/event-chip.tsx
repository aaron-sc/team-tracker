import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/calendar/types";

export function EventChip({ event, className }: { event: CalendarEvent; className?: string }) {
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
      {event.start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} {event.title}
    </Link>
  );
}
