import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/ui/role-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MessageSquare, Calendar, ExternalLink, ShieldAlert } from "lucide-react";
import { formatDate } from "@/lib/utils/format-time";
import { Permission } from "@/lib/generated/prisma/enums";
import { EditMyProfileDialog } from "@/components/roster/edit-my-profile-dialog";
import { Badge } from "@/components/ui/badge";
import { PlayerActionDialog } from "@/components/roster/player-action-dialog";
import { DeletePlayerActionButton } from "@/components/roster/delete-player-action-button";

const NAMED_TRACKERS: { key: "trackerValorant" | "trackerLeagueOfLegends" | "trackerRocketLeague" | "trackerSmash"; label: string }[] = [
  { key: "trackerValorant", label: "Valorant" },
  { key: "trackerLeagueOfLegends", label: "League of Legends" },
  { key: "trackerRocketLeague", label: "Rocket League" },
  { key: "trackerSmash", label: "Smash Bros" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ orgSlug: string; membershipId: string }>;
}) {
  const { orgSlug, membershipId } = await params;
  const { session, org, membership: viewerMembership } = await getOrgContext(orgSlug);
  const viewerTz = session.user.timezone ?? org.timezone;

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: { user: true, role: true, teamMemberships: { include: { team: true } } },
  });
  if (!membership || membership.orgId !== org.id) notFound();

  const canViewContactInfo =
    viewerMembership.membershipId === membership.id ||
    viewerMembership.permissions.includes(Permission.org_members_contact_view);
  const isOwnProfile = viewerMembership.membershipId === membership.id;
  const canViewPlayerActions = viewerMembership.permissions.includes(Permission.player_actions_manage);

  const playerActions = canViewPlayerActions
    ? await prisma.playerAction.findMany({
        where: { teamMembership: { membershipId: membership.id } },
        include: { teamMembership: { include: { team: true } }, createdBy: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const now = new Date();
  const activeBenchTeamIds = new Set(
    playerActions
      .filter(
        (a) =>
          a.type === "BENCHED" &&
          (!a.startDate || a.startDate <= now) &&
          (!a.endDate || a.endDate >= now),
      )
      .map((a) => a.teamMembership.teamId),
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="size-14">
          {membership.user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={membership.user.avatarUrl} alt={membership.user.name} className="size-full rounded-full object-cover" />
          ) : (
            <AvatarFallback className="text-lg">{initials(membership.user.name)}</AvatarFallback>
          )}
        </Avatar>
        <div>
          <h1 className="text-xl font-semibold">{membership.user.name}</h1>
          <RoleBadge name={membership.role.name} color={membership.role.color} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {canViewContactInfo ? (
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              {membership.user.email}
            </div>
          ) : null}
          {canViewContactInfo && membership.user.phone ? (
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              {membership.user.phone}
            </div>
          ) : null}
          {membership.user.discordHandle ? (
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-muted-foreground" />
              {membership.user.discordHandle}
            </div>
          ) : null}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="size-4" />
            Joined {formatDate(membership.joinedAt, viewerTz)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teams</CardTitle>
        </CardHeader>
        <CardContent>
          {membership.teamMemberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not on any team roster yet.</p>
          ) : (
            <div className="space-y-4">
              {membership.teamMemberships.map((tm) => {
                const trackers = [
                  ...NAMED_TRACKERS.filter((t) => tm[t.key]).map((t) => ({ label: t.label, url: tm[t.key]! })),
                  ...(tm.trackerLink ? [{ label: "Other", url: tm.trackerLink }] : []),
                ];
                return (
                  <div key={tm.id} className="space-y-2 border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 font-medium">
                        {tm.team.name}
                        {canViewPlayerActions && activeBenchTeamIds.has(tm.teamId) ? (
                          <Badge variant="destructive">Benched</Badge>
                        ) : null}
                      </span>
                      <span className="flex items-center gap-2 text-muted-foreground">
                        {tm.inGameName ? `"${tm.inGameName}" · ` : ""}
                        {tm.position ?? "—"} {tm.jerseyNumber ? `#${tm.jerseyNumber}` : ""} {tm.isStarter ? "· Starter" : ""}
                      </span>
                    </div>
                    {tm.bio ? <p className="text-sm text-muted-foreground">{tm.bio}</p> : null}
                    {trackers.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        {trackers.map((t) => (
                          <a
                            key={t.label}
                            href={t.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-primary underline underline-offset-4"
                          >
                            <ExternalLink className="size-3" />
                            {t.label}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {isOwnProfile ? (
                      <EditMyProfileDialog
                        orgSlug={orgSlug}
                        orgId={org.id}
                        teamMembershipId={tm.id}
                        teamName={tm.team.name}
                        defaultValues={{
                          bio: tm.bio ?? "",
                          trackerLink: tm.trackerLink ?? "",
                          trackerValorant: tm.trackerValorant ?? "",
                          trackerRocketLeague: tm.trackerRocketLeague ?? "",
                          trackerSmash: tm.trackerSmash ?? "",
                          trackerLeagueOfLegends: tm.trackerLeagueOfLegends ?? "",
                        }}
                      />
                    ) : null}
                    {canViewPlayerActions ? (
                      <PlayerActionDialog
                        orgSlug={orgSlug}
                        orgId={org.id}
                        teamMembershipId={tm.id}
                        membershipId={membership.id}
                        teamName={tm.team.name}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {canViewPlayerActions ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="size-4" />
              Player conduct
            </CardTitle>
          </CardHeader>
          <CardContent>
            {playerActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bench or disciplinary records.</p>
            ) : (
              <div className="space-y-3">
                {playerActions.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium">
                        <Badge variant={a.type === "DISCIPLINARY" ? "destructive" : "secondary"}>
                          {a.type === "DISCIPLINARY" ? "Disciplinary" : "Benched"}
                        </Badge>
                        {a.teamMembership.team.name}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{a.reason}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {a.startDate ? `From ${formatDate(a.startDate, viewerTz)}` : ""}
                        {a.endDate ? ` to ${formatDate(a.endDate, viewerTz)}` : a.startDate ? " (open-ended)" : ""}
                        {a.createdBy ? ` · Recorded by ${a.createdBy.user.name}` : ""}
                        {` · ${formatDate(a.createdAt, viewerTz)}`}
                      </p>
                    </div>
                    <DeletePlayerActionButton
                      orgSlug={orgSlug}
                      orgId={org.id}
                      playerActionId={a.id}
                      membershipId={membership.id}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
