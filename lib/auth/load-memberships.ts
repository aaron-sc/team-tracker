import { prisma } from "@/lib/db/prisma";
import type { SessionMembership } from "@/lib/auth/types";

export async function loadMemberships(userId: string): Promise<SessionMembership[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      org: true,
      role: { include: { permissions: true } },
      teamMemberships: { select: { teamId: true } },
    },
  });

  return memberships.map((m) => ({
    membershipId: m.id,
    orgId: m.orgId,
    orgSlug: m.org.slug,
    orgName: m.org.name,
    roleId: m.roleId,
    roleName: m.role.name,
    permissions: m.role.permissions.map((p) => p.permission),
    teamIds: m.teamMemberships.map((tm) => tm.teamId),
  }));
}
