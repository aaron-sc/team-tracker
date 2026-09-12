import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Swords, Users, CalendarClock } from "lucide-react";

function Bar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${className ?? "bg-primary"}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export default async function AnalyticsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.analytics_view);

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const teams = await prisma.team.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } });
  const teamIds = teams.map((t) => t.id);

  const [matches, upcomingCount, sessionRows, memberCount] = await Promise.all([
    prisma.match.findMany({
      where: { teamId: { in: teamIds } },
      select: { teamId: true, resultStatus: true, scheduledAt: true },
    }),
    prisma.match.count({
      where: { team: { orgId: org.id }, scheduledAt: { gte: now, lte: weekFromNow } },
    }),
    prisma.sessionAttendance.groupBy({
      by: ["sessionId"],
      _count: { _all: true },
      where: { session: { team: { orgId: org.id } }, status: { in: ["ATTENDED", "ABSENT", "LATE"] } },
    }),
    prisma.membership.count({ where: { orgId: org.id } }),
  ]);

  const decided = matches.filter((m) => m.resultStatus === "WIN" || m.resultStatus === "LOSS");
  const wins = decided.filter((m) => m.resultStatus === "WIN").length;
  const orgWinRate = decided.length > 0 ? Math.round((wins / decided.length) * 100) : null;

  const byTeam = new Map<string, { wins: number; losses: number; total: number }>();
  for (const m of matches) {
    const entry = byTeam.get(m.teamId) ?? { wins: 0, losses: 0, total: 0 };
    if (m.resultStatus === "WIN") entry.wins += 1;
    if (m.resultStatus === "LOSS") entry.losses += 1;
    if (m.resultStatus === "WIN" || m.resultStatus === "LOSS") entry.total += 1;
    byTeam.set(m.teamId, entry);
  }

  // Attendance rate per team, reusing the same ATTENDED/LATE-counts-as-attended definition used
  // on the roster page's reliability badge.
  const attendanceDetailRows = await prisma.sessionAttendance.findMany({
    where: { session: { team: { orgId: org.id } }, status: { in: ["ATTENDED", "ABSENT", "LATE"] } },
    select: { status: true, session: { select: { teamId: true } } },
  });
  const attendanceByTeam = new Map<string, { attended: number; total: number }>();
  for (const row of attendanceDetailRows) {
    const entry = attendanceByTeam.get(row.session.teamId) ?? { attended: 0, total: 0 };
    entry.total += 1;
    if (row.status === "ATTENDED" || row.status === "LATE") entry.attended += 1;
    attendanceByTeam.set(row.session.teamId, entry);
  }

  const totalSessions = sessionRows.length;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <Trophy className="mb-2 size-5 text-muted-foreground" />
            <p className="text-2xl font-semibold">{orgWinRate !== null ? `${orgWinRate}%` : "—"}</p>
            <p className="text-xs text-muted-foreground">Org win rate ({decided.length} decided)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Swords className="mb-2 size-5 text-muted-foreground" />
            <p className="text-2xl font-semibold">{matches.length}</p>
            <p className="text-xs text-muted-foreground">Matches logged</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <CalendarClock className="mb-2 size-5 text-muted-foreground" />
            <p className="text-2xl font-semibold">{upcomingCount}</p>
            <p className="text-xs text-muted-foreground">Events this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Users className="mb-2 size-5 text-muted-foreground" />
            <p className="text-2xl font-semibold">{memberCount}</p>
            <p className="text-xs text-muted-foreground">Org members</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams yet.</p>
          ) : (
            teams.map((team) => {
              const record = byTeam.get(team.id) ?? { wins: 0, losses: 0, total: 0 };
              const winPct = record.total > 0 ? Math.round((record.wins / record.total) * 100) : 0;
              return (
                <div key={team.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{team.name}</span>
                    <span className="text-muted-foreground">
                      {record.wins}-{record.losses}
                      {record.total > 0 ? ` (${winPct}%)` : " (no results yet)"}
                    </span>
                  </div>
                  <Bar pct={winPct} />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attendance by team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams yet.</p>
          ) : (
            teams.map((team) => {
              const a = attendanceByTeam.get(team.id);
              const pct = a && a.total > 0 ? Math.round((a.attended / a.total) * 100) : null;
              return (
                <div key={team.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{team.name}</span>
                    <span className="text-muted-foreground">{pct !== null ? `${pct}%` : "No history yet"}</span>
                  </div>
                  <Bar pct={pct ?? 0} className="bg-success" />
                </div>
              );
            })
          )}
          {totalSessions === 0 ? (
            <p className="text-xs text-muted-foreground">Attendance fills in once practices/scrims start getting marked.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
