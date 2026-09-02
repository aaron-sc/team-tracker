import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/ui/role-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MessageSquare, Calendar, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils/format-time";
import { Permission } from "@/lib/generated/prisma/enums";
import { EditMyProfileDialog } from "@/components/roster/edit-my-profile-dialog";

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
                      <span className="font-medium">{tm.team.name}</span>
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
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
