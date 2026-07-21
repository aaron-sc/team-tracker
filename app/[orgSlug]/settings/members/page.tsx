import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { InviteForm } from "@/components/settings/invite-form";
import { MemberRoleSelect } from "@/components/settings/member-role-select";
import { RemoveMemberButton } from "@/components/settings/remove-member-button";
import { CopyInviteLinkButton } from "@/components/settings/copy-invite-link-button";
import { RevokeInviteButton } from "@/components/settings/revoke-invite-button";
import { redirect } from "next/navigation";

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
  const { org, membership } = await getOrgContext(orgSlug);

  const canInvite = membership.permissions.includes(Permission.org_members_invite);
  const canManageRoles = membership.permissions.includes(Permission.org_members_manage);
  const canRemove = membership.permissions.includes(Permission.org_members_remove);
  if (!canInvite && !canManageRoles && !canRemove) redirect(`/${orgSlug}/dashboard`);

  const [members, invites, roles] = await Promise.all([
    prisma.membership.findMany({
      where: { orgId: org.id },
      include: { user: true, role: true },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.invite.findMany({
      where: { orgId: org.id, status: "PENDING" },
      include: { role: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.role.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
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
                      Invited as {invite.role.name} · expires {invite.expiresAt.toLocaleDateString()}
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

      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Members ({members.length})</h3>
        <div className="space-y-2">
          {members.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback>{initials(m.user.name)}</AvatarFallback>
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
                    <Badge variant="secondary">{m.role.name}</Badge>
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
