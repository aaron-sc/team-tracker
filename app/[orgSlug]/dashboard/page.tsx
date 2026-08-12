import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WinLossBar } from "@/components/dashboard/win-loss-bar";
import { AttendanceMeter } from "@/components/dashboard/attendance-meter";
import { FunnelBars } from "@/components/dashboard/funnel-bars";
import { RsvpQuickActions } from "@/components/dashboard/rsvp-quick-actions";
import {
  Calendar,
  Radio,
  Users,
  Shield,
  Target,
  Megaphone,
  MapPin,
  TrendingUp,
  ClipboardCheck,
  CalendarCheck,
  History,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils/format-time";

const AUDIT_ACTION_LABELS: Record<string, string> = {
  "match.created": "created a match",
  "match.duplicated": "duplicated a match",
  "match.result_recorded": "recorded a match result",
  "match.deleted": "deleted a match",
  "practice.created": "scheduled a practice",
  "practice.duplicated": "duplicated a practice",
  "practice.deleted": "deleted a practice",
  "team.created": "created a team",
  "team.updated": "updated a team",
  "team.logo_updated": "updated a team logo",
  "roster.member_added": "added a roster member",
  "roster.member_removed": "removed a roster member",
  "org.logo_updated": "updated the org logo",
  "invite.created": "invited a member",
  "member.removed": "removed a member",
  "team_invite_link.created": "created a team invite link",
};

const STAGE_LABELS: Record<string, string> = {
  SCOUTING: "Scouting",
  CONTACTED: "Contacted",
  TRYOUT: "Tryout",
  OFFER: "Offer",
  SIGNED: "Signed",
  PASSED: "Passed",
};

export default async function DashboardPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { session, org, membership, teams } = await getOrgContext(orgSlug);
  const viewerTz = session.user.timezone ?? org.timezone;

  const now = new Date();
  const canViewRecruitment = membership.permissions.includes(Permission.recruitment_view);
  const canViewAudit = membership.permissions.includes(Permission.audit_log_view);

  const [
    upcomingMatches,
    upcomingSessions,
    announcements,
    memberCount,
    teamCount,
    prospectsByStage,
    matchResultsByTeam,
    attendanceByStatus,
    pendingRsvps,
    recentActivity,
  ] = await Promise.all([
    prisma.match.findMany({
      where: { team: { orgId: org.id }, scheduledAt: { gte: now }, status: "SCHEDULED" },
      include: { team: true, opponent: true },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    prisma.practiceSession.findMany({
      where: { team: { orgId: org.id }, scheduledAt: { gte: now } },
      include: { team: true, opponent: true },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    prisma.announcement.findMany({
      where: { orgId: org.id },
      include: { author: { include: { user: true } } },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 4,
    }),
    prisma.membership.count({ where: { orgId: org.id } }),
    prisma.team.count({ where: { orgId: org.id } }),
    canViewRecruitment
      ? prisma.recruitmentProspect.groupBy({ by: ["stage"], where: { orgId: org.id }, _count: true })
      : Promise.resolve([]),
    prisma.match.groupBy({
      by: ["teamId", "resultStatus"],
      where: { team: { orgId: org.id }, status: "COMPLETED" },
      _count: true,
    }),
    prisma.sessionAttendance.groupBy({
      by: ["status"],
      where: {
        session: { team: { orgId: org.id }, scheduledAt: { lt: now } },
        status: { in: ["ATTENDED", "ABSENT", "LATE"] },
      },
      _count: true,
    }),
    prisma.sessionAttendance.findMany({
      where: { membershipId: membership.membershipId, status: "INVITED", session: { scheduledAt: { gte: now } } },
      include: { session: { include: { team: true, opponent: true } } },
      orderBy: { session: { scheduledAt: "asc" } },
      take: 5,
    }),
    canViewAudit
      ? prisma.auditLog.findMany({
          where: { orgId: org.id },
          include: { actorMembership: { include: { user: true } } },
          orderBy: { createdAt: "desc" },
          take: 6,
        })
      : Promise.resolve([]),
  ]);

  const winLossByTeam = new Map(teams.map((t) => [t.id, { wins: 0, losses: 0, draws: 0 }]));
  for (const row of matchResultsByTeam) {
    const entry = winLossByTeam.get(row.teamId);
    if (!entry || !row.resultStatus) continue;
    if (row.resultStatus === "WIN") entry.wins += row._count;
    else if (row.resultStatus === "LOSS") entry.losses += row._count;
    else if (row.resultStatus === "DRAW") entry.draws += row._count;
  }

  const attendanceCounts: Record<string, number> = { ATTENDED: 0, ABSENT: 0, LATE: 0 };
  for (const row of attendanceByStatus) attendanceCounts[row.status] = row._count;
  const totalResolvedAttendance = attendanceCounts.ATTENDED + attendanceCounts.ABSENT + attendanceCounts.LATE;
  const attendanceRate =
    totalResolvedAttendance > 0 ? ((attendanceCounts.ATTENDED + attendanceCounts.LATE) / totalResolvedAttendance) * 100 : null;

  const prospectCounts = Object.fromEntries(prospectsByStage.map((g) => [g.stage, g._count]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{org.name}</h1>
        <p className="text-muted-foreground">Welcome back, here&apos;s what&apos;s happening.</p>
      </div>

      {!session.user.timezone ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <span>
              Set your timezone so match and practice times show correctly for you — right now they&apos;re shown in{" "}
              {org.timezone.replace(/_/g, " ")} (the organization&apos;s default).
            </span>
            <Link href="/account" className="shrink-0 font-medium text-primary underline underline-offset-4">
              Set timezone
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Users className="size-5" />} label="Members" value={memberCount} href={`/${orgSlug}/roster`} />
        <StatCard icon={<Shield className="size-5" />} label="Teams" value={teamCount} href={`/${orgSlug}/teams`} />
        <StatCard
          icon={<Calendar className="size-5" />}
          label="Upcoming events"
          value={upcomingMatches.length + upcomingSessions.length}
          href={`/${orgSlug}/schedule`}
        />
      </div>

      {pendingRsvps.length > 0 ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck className="size-4" />
              Needs your response
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRsvps.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-2.5 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {a.session.team.name}{" "}
                    {a.session.type === "SCRIM" ? `scrim vs ${a.session.opponent?.name ?? "TBD"}` : "practice"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(a.session.scheduledAt, viewerTz)}
                  </p>
                </div>
                <RsvpQuickActions orgSlug={orgSlug} orgId={org.id} attendanceId={a.id} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming matches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matches scheduled.</p>
            ) : (
              upcomingMatches.map((m) => (
                <Link
                  key={m.id}
                  href={`/${orgSlug}/schedule/matches/${m.id}`}
                  className="flex items-center justify-between rounded-md border p-2.5 text-sm hover:bg-accent"
                >
                  <div>
                    <p className="font-medium">
                      {m.team.name} vs {m.opponent.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(m.scheduledAt, viewerTz)}
                    </p>
                  </div>
                  {m.isStreamed ? (
                    <Badge variant="secondary" className="gap-1">
                      <Radio className="size-3" />
                      Live
                    </Badge>
                  ) : null}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming practice &amp; scrims</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
            ) : (
              upcomingSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/${orgSlug}/schedule/practice/${s.id}`}
                  className="flex items-center justify-between rounded-md border p-2.5 text-sm hover:bg-accent"
                >
                  <div>
                    <p className="font-medium">
                      {s.team.name} {s.type === "SCRIM" ? `vs ${s.opponent?.name ?? "TBD"}` : "practice"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(s.scheduledAt, viewerTz)}
                    </p>
                  </div>
                  <Badge variant="outline">{s.type}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="size-4" />
              Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="border-b pb-2 last:border-0 last:pb-0">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
                </div>
              ))
            )}
            <Link href={`/${orgSlug}/announcements`} className="text-sm text-primary underline underline-offset-4">
              View all
            </Link>
          </CardContent>
        </Card>

        {canViewRecruitment ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="size-4" />
                Recruitment pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FunnelBars counts={prospectCounts} labels={STAGE_LABELS} />
              <Link href={`/${orgSlug}/recruitment`} className="text-sm text-primary underline underline-offset-4">
                Open pipeline
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-4" />
                Quick links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link href={`/${orgSlug}/venues`} className="block text-primary underline underline-offset-4">
                Venues
              </Link>
              <Link href={`/${orgSlug}/availability`} className="block text-primary underline underline-offset-4">
                My availability
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4" />
              Team performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">No teams yet.</p>
            ) : (
              teams.map((t) => {
                const record = winLossByTeam.get(t.id) ?? { wins: 0, losses: 0, draws: 0 };
                return <WinLossBar key={t.id} teamName={t.name} wins={record.wins} losses={record.losses} draws={record.draws} />;
              })
            )}
            <Link href={`/${orgSlug}/schedule/results`} className="text-sm text-primary underline underline-offset-4">
              View all results
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="size-4" />
              Practice attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceMeter rate={attendanceRate} sampleSize={totalResolvedAttendance} />
          </CardContent>
        </Card>
      </div>

      {canViewAudit ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4" />
              Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              recentActivity.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0 last:pb-0">
                  <span>
                    <span className="font-medium">{entry.actorMembership?.user.name ?? "Someone"}</span>{" "}
                    {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt, viewerTz)}
                  </span>
                </div>
              ))
            )}
            <Link href={`/${orgSlug}/settings/audit-log`} className="text-sm text-primary underline underline-offset-4">
              View full audit log
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function StatCard({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: number; href: string }) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-accent">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</div>
          <div>
            <p className="text-2xl font-semibold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
