import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/ui/role-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddRosterForm } from "@/components/teams/add-roster-form";
import { RemoveRosterButton } from "@/components/teams/remove-roster-button";
import { EditRosterEntryDialog } from "@/components/teams/edit-roster-entry-dialog";
import { TeamInviteLinkPanel } from "@/components/teams/team-invite-link-panel";
import { TeamResourcesPanel } from "@/components/teams/team-resources-panel";
import { TeamPollsPanel } from "@/components/teams/team-polls-panel";
import { addToRosterAction } from "@/lib/actions/teams";
import { Pencil, Star, Calendar, Swords, ExternalLink } from "lucide-react";
import { formatDateTimeShort } from "@/lib/utils/format-time";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string }>;
}) {
  const { orgSlug, teamSlug } = await params;
  const { session, org, membership } = await getOrgContext(orgSlug);
  const viewerTz = session.user.timezone ?? org.timezone;
  const viewerHour12 = session.user.timeFormat !== "24h";

  const team = await prisma.team.findUnique({ where: { orgId_slug: { orgId: org.id, slug: teamSlug } } });
  if (!team) notFound();

  const canManageRoster = membership.permissions.includes(Permission.roster_manage);
  const canEditTeam = membership.permissions.includes(Permission.team_edit);
  const canManageResources = membership.permissions.includes(Permission.team_resources_manage);
  const canManagePolls = membership.permissions.includes(Permission.poll_manage);
  const canInviteToTeam =
    membership.permissions.includes(Permission.org_members_invite) ||
    (membership.permissions.includes(Permission.team_members_invite) && membership.teamIds.includes(team.id));

  const [roster, allMembers, roles, inviteLinks, upcomingMatches, upcomingPractices] = await Promise.all([
    prisma.teamMembership.findMany({
      where: { teamId: team.id },
      include: { membership: { include: { user: true, role: true } } },
      orderBy: { joinedTeamAt: "asc" },
    }),
    prisma.membership.findMany({
      where: { orgId: org.id },
      include: { user: true, role: true },
      orderBy: { user: { name: "asc" } },
    }),
    canInviteToTeam ? prisma.role.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    canInviteToTeam
      ? prisma.teamInviteLink.findMany({
          where: { teamId: team.id, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          include: { role: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.match.findMany({
      where: { teamId: team.id, scheduledAt: { gte: new Date() } },
      include: { opponent: true },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    prisma.practiceSession.findMany({
      where: { teamId: team.id, scheduledAt: { gte: new Date() } },
      include: { opponent: true },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
  ]);

  const [resourceLinks, polls] = await Promise.all([
    prisma.teamResourceLink.findMany({ where: { teamId: team.id }, orderBy: { createdAt: "desc" } }),
    prisma.poll.findMany({
      where: { teamId: team.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { options: { orderBy: { order: "asc" }, include: { votes: true } } },
    }),
  ]);
  const pollItems = polls.map((p) => {
    const totalVotes = p.options.reduce((sum, o) => sum + o.votes.length, 0);
    const myVote = p.options.find((o) => o.votes.some((v) => v.membershipId === membership.membershipId));
    return {
      id: p.id,
      question: p.question,
      closesAt: p.closesAt ? p.closesAt.toISOString() : null,
      totalVotes,
      myVoteOptionId: myVote?.id ?? null,
      options: p.options.map((o) => ({ id: o.id, label: o.label, voteCount: o.votes.length })),
    };
  });

  // Leaderboard: attendance rate for this team's own sessions specifically (not the org-wide
  // figure shown on the roster page), ranked, minimum 1 recorded session to qualify.
  const teamAttendanceRows = await prisma.sessionAttendance.findMany({
    where: { session: { teamId: team.id }, status: { in: ["ATTENDED", "ABSENT", "LATE"] } },
    select: { membershipId: true, status: true },
  });
  const teamAttendanceByMember = new Map<string, { attended: number; total: number }>();
  for (const row of teamAttendanceRows) {
    const entry = teamAttendanceByMember.get(row.membershipId) ?? { attended: 0, total: 0 };
    entry.total += 1;
    if (row.status === "ATTENDED" || row.status === "LATE") entry.attended += 1;
    teamAttendanceByMember.set(row.membershipId, entry);
  }
  const leaderboard = roster
    .map((r) => {
      const entry = teamAttendanceByMember.get(r.membershipId);
      return {
        membershipId: r.membershipId,
        name: r.membership.user.name,
        rate: entry && entry.total > 0 ? Math.round((entry.attended / entry.total) * 100) : null,
        total: entry?.total ?? 0,
      };
    })
    .filter((r) => r.rate !== null)
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))
    .slice(0, 5);

  const upcoming = [
    ...upcomingMatches.map((m) => ({
      id: `match-${m.id}`,
      href: `/${orgSlug}/schedule/matches/${m.id}`,
      title: `vs ${m.opponent.name}`,
      subtitle: m.format,
      scheduledAt: m.scheduledAt,
      icon: "match" as const,
    })),
    ...upcomingPractices.map((s) => ({
      id: `practice-${s.id}`,
      href: `/${orgSlug}/schedule/practice/${s.id}`,
      title: s.type === "SCRIM" ? `Scrim vs ${s.opponent?.name ?? "TBD"}` : "Practice",
      subtitle: `${s.durationMinutes} min`,
      scheduledAt: s.scheduledAt,
      icon: "practice" as const,
    })),
  ]
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .slice(0, 5);

  const rosterMembershipIds = new Set(roster.map((r) => r.membershipId));
  const candidates = allMembers
    .filter((m) => !rosterMembershipIds.has(m.id))
    .map((m) => ({ membershipId: m.id, name: m.user.name, roleName: m.role.name }));

  const addAction = addToRosterAction.bind(null, orgSlug, org.id, team.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="size-12 rounded-lg">
            {team.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={team.logoUrl} alt={team.name} className="size-full rounded-lg object-cover" />
            ) : (
              <AvatarFallback className="rounded-lg">
                {team.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold">{team.name}</h1>
            <p className="text-sm text-muted-foreground">{team.game}</p>
          </div>
        </div>
        {canEditTeam ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${orgSlug}/teams/${team.slug}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length > 0 ? (
            <div className="space-y-2">
              {upcoming.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md border p-2.5 text-sm transition-colors hover:bg-accent"
                >
                  {item.icon === "match" ? (
                    <Swords className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Calendar className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTimeShort(item.scheduledAt, viewerTz, viewerHour12)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>In-game name</TableHead>
                <TableHead>Tracker</TableHead>
                <TableHead>#</TableHead>
                <TableHead>Starter</TableHead>
                {canManageRoster ? <TableHead className="w-20" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Link
                      href={`/${orgSlug}/roster/${entry.membershipId}`}
                      className="font-medium hover:underline"
                    >
                      {entry.membership.user.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <RoleBadge name={entry.membership.role.name} color={entry.membership.role.color} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{entry.position ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.inGameName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {(() => {
                      const primaryTracker =
                        entry.trackerValorant ||
                        entry.trackerLeagueOfLegends ||
                        entry.trackerRocketLeague ||
                        entry.trackerSmash ||
                        entry.trackerLink;
                      return primaryTracker ? (
                        <a
                          href={primaryTracker}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-primary underline underline-offset-4"
                        >
                          <ExternalLink className="size-3.5" />
                          Stats
                        </a>
                      ) : (
                        "—"
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{entry.jerseyNumber ?? "—"}</TableCell>
                  <TableCell>{entry.isStarter ? <Star className="size-4 fill-primary text-primary" /> : null}</TableCell>
                  {canManageRoster ? (
                    <TableCell className="flex items-center gap-1">
                      <EditRosterEntryDialog
                        orgSlug={orgSlug}
                        orgId={org.id}
                        teamMembershipId={entry.id}
                        playerName={entry.membership.user.name}
                        defaultValues={{
                          position: entry.position ?? "",
                          jerseyNumber: entry.jerseyNumber ?? "",
                          inGameName: entry.inGameName ?? "",
                          bio: entry.bio ?? "",
                          trackerLink: entry.trackerLink ?? "",
                          trackerValorant: entry.trackerValorant ?? "",
                          trackerRocketLeague: entry.trackerRocketLeague ?? "",
                          trackerSmash: entry.trackerSmash ?? "",
                          trackerLeagueOfLegends: entry.trackerLeagueOfLegends ?? "",
                          isStarter: entry.isStarter,
                        }}
                      />
                      <RemoveRosterButton orgSlug={orgSlug} orgId={org.id} teamMembershipId={entry.id} />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
              {roster.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManageRoster ? 8 : 7} className="text-center text-muted-foreground">
                    No one on the roster yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {leaderboard.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {leaderboard.map((row, i) => (
              <div key={row.membershipId} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-4 text-muted-foreground">{i + 1}</span>
                  {row.name}
                </span>
                <span className="text-muted-foreground">
                  {row.rate}% <span className="text-xs">({row.total} sessions)</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamResourcesPanel
            orgSlug={orgSlug}
            orgId={org.id}
            teamId={team.id}
            teamSlug={team.slug}
            links={resourceLinks.map((l) => ({ id: l.id, title: l.title, url: l.url }))}
            canManage={canManageResources}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Polls</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamPollsPanel orgSlug={orgSlug} orgId={org.id} teamId={team.id} polls={pollItems} canManage={canManagePolls} />
        </CardContent>
      </Card>

      {canManageRoster ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add to roster</CardTitle>
          </CardHeader>
          <CardContent>
            <AddRosterForm action={addAction} candidates={candidates} />
          </CardContent>
        </Card>
      ) : null}

      {canInviteToTeam ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite link</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamInviteLinkPanel
              orgSlug={orgSlug}
              orgId={org.id}
              teams={[{ id: team.id, name: team.name }]}
              roles={roles.map((r) => ({ id: r.id, name: r.name }))}
              links={inviteLinks.map((l) => ({ id: l.id, token: l.token, teamName: team.name, roleName: l.role.name, useCount: l.useCount }))}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
