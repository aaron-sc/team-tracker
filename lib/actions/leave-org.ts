"use server";

import { prisma } from "@/lib/db/prisma";
import { requireMembership } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import type { ActionState } from "@/lib/actions/types";

/** A member voluntarily removes themselves from an org. Blocked if they're the org's only Owner. */
export async function leaveOrgAction(orgId: string): Promise<ActionState> {
  const { session, membership } = await requireMembership(orgId);

  if (membership.roleName === "Owner") {
    const otherOwners = await prisma.membership.count({
      where: { orgId, role: { name: "Owner" }, id: { not: membership.membershipId } },
    });
    if (otherOwners === 0) {
      return {
        error:
          "You're the only Owner of this organization. Promote someone else to Owner first, or delete the organization instead.",
      };
    }
  }

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "member.left",
    targetType: "Membership",
    targetId: membership.membershipId,
    metadata: { memberName: session.user.name ?? session.user.email ?? "" },
  });

  await prisma.membership.delete({ where: { id: membership.membershipId } });

  return { success: `You've left ${membership.orgName}.` };
}
