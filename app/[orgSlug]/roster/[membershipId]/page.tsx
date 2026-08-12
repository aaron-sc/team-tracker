import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/ui/role-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MessageSquare, Calendar, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils/format-time";

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
  const { session, org } = await getOrgContext(orgSlug);
  const viewerTz = session.user.timezone ?? org.timezone;

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: { user: true, role: true, teamMemberships: { include: { team: true } } },
  });
  if (!membership || membership.orgId !== org.id) notFound();

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
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            {membership.user.email}
          </div>
          {membership.user.phone ? (
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
            <div className="space-y-2">
              {membership.teamMemberships.map((tm) => (
                <div key={tm.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{tm.team.name}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {tm.inGameName ? `"${tm.inGameName}" · ` : ""}
                    {tm.position ?? "—"} {tm.jerseyNumber ? `#${tm.jerseyNumber}` : ""} {tm.isStarter ? "· Starter" : ""}
                    {tm.trackerLink ? (
                      <a
                        href={tm.trackerLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-primary underline underline-offset-4"
                      >
                        <ExternalLink className="size-3.5" />
                        Stats
                      </a>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
