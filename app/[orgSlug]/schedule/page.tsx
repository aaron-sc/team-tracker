import Link from "next/link";
import { addMonths, addWeeks, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { MonthGrid } from "@/components/calendar/month-grid";
import { WeekAgenda } from "@/components/calendar/week-agenda";
import type { CalendarEvent } from "@/lib/calendar/types";
import { SubscribeCalendarDialog } from "@/components/schedule/subscribe-calendar-dialog";
import { ChevronLeft, ChevronRight, Plus, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

function buildHref(base: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) search.set(k, v);
  }
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

export default async function SchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ view?: string; date?: string; team?: string }>;
}) {
  const { orgSlug } = await params;
  const { view = "month", date, team } = await searchParams;
  const { org, membership, teams } = await getOrgContext(orgSlug);

  const anchor = date ? new Date(`${date}T00:00:00`) : new Date();
  const isWeek = view === "week";

  const rangeStart = isWeek ? startOfWeek(anchor) : startOfWeek(startOfMonth(anchor));
  const rangeEnd = isWeek ? endOfWeek(anchor) : endOfWeek(endOfMonth(anchor));

  const teamWhere = team ? { teamId: team, team: { orgId: org.id } } : { team: { orgId: org.id } };

  const [matches, sessions] = await Promise.all([
    prisma.match.findMany({
      where: { scheduledAt: { gte: rangeStart, lte: rangeEnd }, ...teamWhere },
      include: { team: true, opponent: true },
    }),
    prisma.practiceSession.findMany({
      where: { scheduledAt: { gte: rangeStart, lte: rangeEnd }, ...teamWhere },
      include: { team: true, opponent: true },
    }),
  ]);

  const events: CalendarEvent[] = [
    ...matches.map((m) => ({
      id: `match-${m.id}`,
      type: "match" as const,
      title: `${m.team.name} vs ${m.opponent.name}`,
      subtitle: m.format,
      start: m.scheduledAt,
      end: m.scheduledAt,
      href: `/${orgSlug}/schedule/matches/${m.id}`,
    })),
    ...sessions.map((s) => ({
      id: `practice-${s.id}`,
      type: "practice" as const,
      title: s.type === "SCRIM" ? `${s.team.name} scrim vs ${s.opponent?.name ?? "TBD"}` : `${s.team.name} practice`,
      start: s.scheduledAt,
      end: new Date(s.scheduledAt.getTime() + s.durationMinutes * 60 * 1000),
      href: `/${orgSlug}/schedule/practice/${s.id}`,
    })),
  ];

  const prevAnchor = isWeek ? subWeeks(anchor, 1) : subMonths(anchor, 1);
  const nextAnchor = isWeek ? addWeeks(anchor, 1) : addMonths(anchor, 1);
  const base = `/${orgSlug}/schedule`;

  const canCreateMatch = membership.permissions.includes(Permission.match_create);
  const canCreatePractice = membership.permissions.includes(Permission.practice_create);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" asChild>
            <Link href={buildHref(base, { view, team, date: format(prevAnchor, "yyyy-MM-dd") })}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="min-w-40 text-lg font-semibold">
            {isWeek
              ? `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`
              : format(anchor, "MMMM yyyy")}
          </h1>
          <Button variant="outline" size="icon-sm" asChild>
            <Link href={buildHref(base, { view, team, date: format(nextAnchor, "yyyy-MM-dd") })}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={buildHref(base, { view, team })}>Today</Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-md border text-sm">
            <Link
              href={buildHref(base, { view: "month", team, date })}
              className={cn("px-3 py-1.5", !isWeek ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
            >
              Month
            </Link>
            <Link
              href={buildHref(base, { view: "week", team, date })}
              className={cn("px-3 py-1.5", isWeek ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
            >
              Week
            </Link>
          </div>

          <div className="flex overflow-hidden rounded-md border text-sm">
            <Link
              href={buildHref(base, { view, date })}
              className={cn("px-3 py-1.5", !team ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
            >
              All teams
            </Link>
            {teams.map((t) => (
              <Link
                key={t.id}
                href={buildHref(base, { view, date, team: t.id })}
                className={cn("px-3 py-1.5", team === t.id ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
              >
                {t.name}
              </Link>
            ))}
          </div>

          {canCreateMatch ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/${orgSlug}/schedule/matches/new`}>
                <Plus className="size-4" />
                Match
              </Link>
            </Button>
          ) : null}
          {canCreatePractice ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/${orgSlug}/schedule/practice/new`}>
                <Plus className="size-4" />
                Practice
              </Link>
            </Button>
          ) : null}
          <Button size="sm" variant="outline" asChild>
            <Link href={`/${orgSlug}/schedule/results`}>
              <ListChecks className="size-4" />
              Results
            </Link>
          </Button>
          <SubscribeCalendarDialog orgSlug={orgSlug} apiKey={org.apiKey} />
        </div>
      </div>

      {isWeek ? <WeekAgenda week={anchor} events={events} /> : <MonthGrid month={anchor} events={events} today={new Date()} />}
    </div>
  );
}
