import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/calendar/types";
import { formatTimeShort } from "@/lib/utils/format-time";

export function EventChip({
  event,
  timeZone,
  hour12 = true,
  className,
}: {
  event: CalendarEvent;
  timeZone: string;
  hour12?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={event.href}
      className={cn(
        "block truncate rounded px-1.5 py-0.5 text-xs font-medium transition-colors",
        event.type === "match"
          ? "bg-primary/15 text-primary hover:bg-primary/25"
          // A separate hue from --primary on purpose — Formation's brand accent and "match" chips
          // already use the primary color, so practice needs real contrast against it, not just a
          // tint of the same hue.
          : "bg-chart-2/15 text-chart-2 hover:bg-chart-2/25",
        className,
      )}
      title={event.title}
    >
      {formatTimeShort(event.start, timeZone, hour12)} {event.title}
    </Link>
  );
}
