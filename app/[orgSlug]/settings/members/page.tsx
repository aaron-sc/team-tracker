import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/ui/role-badge";
import { InviteForm } from "@/components/settings/invite-form";
import { MemberRoleSelect } from "@/components/settings/member-role-select";
import { RemoveMemberButton } from "@/components/settings/remove-member-button";
import { CopyInviteLinkButton } from "@/components/settings/copy-invite-link-button";
import { RevokeInviteButton } from "@/components/settings/revoke-invite-button";
import { TeamInviteLinkPanel } from "@/components/teams/team-invite-link-panel";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils/format-time";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function MembersPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { session, org, membership } = await getOrgContext(orgSlug);
  const viewerTz = session.user.timezone ?? org.timezone;

  const canInvite = membership.permissions.includes(Permission.org_members_invite);
  const canManageRoles = membership.permissions.includes(Permission.org_members_manage);
  const canRemove = membership.permissions.includes(Permission.org_members_remove);
  const canInviteOwnTeams = membership.permissions.includes(Permission.team_members_invite) && membership.teamIds.length > 0;
  if (!canInvite && !canManageRoles && !canRemove && !canInviteOwnTeams) redirect(`/${orgSlug}/dashboard`);

  const inviteLinkTeamFilter = canInvite ? { orgId: org.id } : { orgId: org.id, id: { in: membership.teamIds } };

  const [members, invites, roles, inviteLinkTeams, inviteLinks] = await Promise.all([
    prisma.membership.findMany({
      where: { orgId: org.id },
      include: { user: true, role: true },
      orderBy: { joinedAt: "asc" },
    }),
    canInvite
      ? prisma.invite.findMany({
          where: { orgId: org.id, status: "PENDING" },
          include: { role: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.role.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
    canInvite || canInviteOwnTeams
      ? prisma.team.findMany({ where: inviteLinkTeamFilter, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    canInvite || canInviteOwnTeams
      ? prisma.teamInviteLink.findMany({
          where: {
            teamId: canInvite ? undefined : { in: membership.teamIds },
            orgId: org.id,
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          include: { role: true, team: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      {canInvite ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite a member</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteForm orgSlug={orgSlug} orgId={org.id} roles={roles} />
          </CardContent>
        </Card>
      ) : null}

      {canInvite && invites.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Pending invites</h3>
          <div className="space-y-2">
            {invites.map((invite) => (
              <Card key={invite.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Invited as {invite.role.name} · expires {formatDate(invite.expiresAt, viewerTz)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CopyInviteLinkButton token={invite.token} />
                    <RevokeInviteButton orgSlug={orgSlug} orgId={org.id} inviteId={invite.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {canInvite || canInviteOwnTeams ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team invite links</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamInviteLinkPanel
              orgSlug={orgSlug}
              orgId={org.id}
              teams={inviteLinkTeams.map((t) => ({ id: t.id, name: t.name }))}
              roles={roles.map((r) => ({ id: r.id, name: r.name }))}
              links={inviteLinks.map((l) => ({
                id: l.id,
                token: l.token,
                teamName: l.team.name,
                roleName: l.role.name,
                useCount: l.useCount,
              }))}
            />
          </CardContent>
        </Card>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Members ({members.length})</h3>
        <div className="space-y-2">
          {members.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    {m.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.user.avatarUrl} alt={m.user.name} className="size-full rounded-full object-cover" />
                    ) : (
                      <AvatarFallback>{initials(m.user.name)}</AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManageRoles ? (
                    <MemberRoleSelect
                      orgSlug={orgSlug}
                      orgId={org.id}
                      membershipId={m.id}
                      roleId={m.roleId}
                      roles={roles}
                    />
                  ) : (
                    <RoleBadge name={m.role.name} color={m.role.color} />
                  )}
                  {canRemove ? (
                    <RemoveMemberButton
                      orgSlug={orgSlug}
                      orgId={org.id}
                      membershipId={m.id}
                      disabled={m.id === membership.membershipId}
                    />
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
