import { Fragment } from "react";
import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatWallClockTime } from "@/lib/utils/format-time";
import { convertWeeklyTime } from "@/lib/utils/availability-tz";
import { computeTeamAvailabilityOverlap } from "@/lib/availability/overlap";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function TeamAvailabilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ team?: string }>;
}) {
  const { orgSlug } = await params;
  const { team: teamId } = await searchParams;
  const { session, org, membership, teams } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.availability_manage_others);
  const viewerHour12 = session.user.timeFormat !== "24h";

  const activeTeamId = teamId ?? teams[0]?.id;

  const [members, overlap] = await Promise.all([
    activeTeamId
      ? prisma.membership.findMany({
          where: { orgId: org.id, teamMemberships: { some: { teamId: activeTeamId } } },
          include: { user: true, availabilityRules: { orderBy: { startTime: "asc" } } },
          orderBy: { user: { name: "asc" } },
        })
      : Promise.resolve([]),
    activeTeamId ? computeTeamAvailabilityOverlap(activeTeamId, org.timezone) : Promise.resolve(null),
  ]);

  // Hourly rollup for the heatmap — the MIN of the two half-hour sub-slots, so a cell only reads
  // as "available" if the whole hour is, matching how suggested-time windows are picked elsewhere.
  const hourlyGrid = overlap
    ? Array.from({ length: 7 }, (_, day) =>
        Array.from({ length: 24 }, (_, hour) => Math.min(overlap.counts[day][hour * 2], overlap.counts[day][hour * 2 + 1])),
      )
    : null;

  // Each member sets their availability in their own timezone; converting every rule to the
  // org's timezone here (rather than showing the stored wall-clock strings verbatim) is the
  // whole point of this page — otherwise a captain in Chicago reading a Pacific-time player's
  // "6:00 PM" would silently assume it means 6 PM their own time. A rule can land on a different
  // day of week once converted (e.g. 11 PM Monday Pacific = 1 AM Tuesday Chicago) — that's
  // handled naturally by grouping the *converted* day, not the original one.
  const membersWithConvertedRules = members.map((m) => ({
    ...m,
    convertedRules: m.availabilityRules.map((r) => {
      if (r.timezone === org.timezone) {
        return { dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime };
      }
      const start = convertWeeklyTime(r.dayOfWeek, r.startTime, r.timezone, org.timezone);
      const end = convertWeeklyTime(r.dayOfWeek, r.endTime, r.timezone, org.timezone);
      return { dayOfWeek: start.dayOfWeek, startTime: start.time, endTime: end.time };
    }),
  }));

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {teams.map((t) => (
          <Link
            key={t.id}
            href={`/${orgSlug}/availability/team?team=${t.id}`}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm",
              t.id === activeTeamId ? "bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {t.name}
          </Link>
        ))}
      </div>

      {!activeTeamId ? (
        <p className="text-muted-foreground">Create a team first.</p>
      ) : (
        <>
          {hourlyGrid && overlap && overlap.rosterSize > 0 ? (
            <div className="mb-6 overflow-x-auto rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">When is the team most available?</h2>
                <p className="text-xs text-muted-foreground">
                  Darker = more of the {overlap.rosterSize}-person roster free that hour (org timezone)
                </p>
              </div>
              <div className="inline-grid min-w-full gap-px" style={{ gridTemplateColumns: "44px repeat(7, 1fr)" }}>
                <div />
                {DAYS.map((d) => (
                  <div key={d} className="pb-1 text-center text-[11px] font-medium text-muted-foreground">
                    {d}
                  </div>
                ))}
                {Array.from({ length: 24 }, (_, hour) => (
                  <Fragment key={hour}>
                    <div className="pr-1.5 text-right text-[10px] text-muted-foreground">
                      {hour % 3 === 0 ? formatWallClockTime(`${String(hour).padStart(2, "0")}:00`, viewerHour12) : ""}
                    </div>
                    {DAYS.map((_, day) => {
                      const count = hourlyGrid[day][hour];
                      const ratio = count / overlap.rosterSize;
                      return (
                        <div
                          key={`${day}-${hour}`}
                          title={`${DAYS_LONG[day]} ${formatWallClockTime(`${String(hour).padStart(2, "0")}:00`, viewerHour12)} — ${count}/${overlap.rosterSize} available`}
                          className="h-3 rounded-[2px]"
                          style={{
                            backgroundColor: ratio > 0 ? `rgba(16, 185, 129, ${0.12 + ratio * 0.75})` : "var(--muted)",
                            opacity: ratio > 0 ? 1 : 0.35,
                          }}
                        />
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-lg border">
          <p className="border-b bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
            Times below are converted to your org&apos;s timezone ({org.timezone.replace(/_/g, " ")}) — each player
            sets availability in their own local time.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Player</TableHead>
                {DAYS.map((d) => (
                  <TableHead key={d}>{d}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {membersWithConvertedRules.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    <Link href={`/${orgSlug}/roster/${m.id}`} className="hover:underline">
                      {m.user.name}
                    </Link>
                  </TableCell>
                  {DAYS.map((_, dayOfWeek) => {
                    const dayRules = m.convertedRules.filter((r) => r.dayOfWeek === dayOfWeek);
                    return (
                      <TableCell key={dayOfWeek} className="text-xs text-muted-foreground">
                        {dayRules.length === 0
                          ? "—"
                          : dayRules
                              .map(
                                (r) =>
                                  `${formatWallClockTime(r.startTime, viewerHour12)}-${formatWallClockTime(r.endTime, viewerHour12)}`,
                              )
                              .join(", ")}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No one on this team&apos;s roster yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          </div>
        </>
      )}
    </div>
  );
}
