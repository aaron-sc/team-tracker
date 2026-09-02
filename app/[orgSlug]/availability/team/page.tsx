import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatWallClockTime } from "@/lib/utils/format-time";
import { convertWeeklyTime } from "@/lib/utils/availability-tz";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

  const members = activeTeamId
    ? await prisma.membership.findMany({
        where: { orgId: org.id, teamMemberships: { some: { teamId: activeTeamId } } },
        include: { user: true, availabilityRules: { orderBy: { startTime: "asc" } } },
        orderBy: { user: { name: "asc" } },
      })
    : [];

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
      )}
    </div>
  );
}
