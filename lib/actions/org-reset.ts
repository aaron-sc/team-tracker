"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

/**
 * Wipes an org's seasonal/operational data — roster assignments, schedule,
 * recruitment pipeline, messages, and announcements — while keeping the org
 * itself, its roles, its members, teams (as shells), venues, and audit log
 * intact. Meant for "start a new season clean," not account deletion.
 */
export async function resetOrgDataAction(
  orgSlug: string,
  orgId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.org_data_reset);

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return { error: "Organization not found." };

  const confirmName = formData.get("confirmName");
  if (typeof confirmName !== "string" || confirmName !== org.name) {
    return { error: "Type the organization's name exactly to confirm." };
  }

  const [teamMemberships, matches, sessions, prospects, announcements, conversations] = await prisma.$transaction([
    prisma.teamMembership.deleteMany({ where: { team: { orgId } } }),
    prisma.match.deleteMany({ where: { team: { orgId } } }),
    prisma.practiceSession.deleteMany({ where: { team: { orgId } } }),
    prisma.recruitmentProspect.deleteMany({ where: { orgId } }),
    prisma.announcement.deleteMany({ where: { orgId } }),
    prisma.conversation.deleteMany({ where: { orgId } }),
  ]);
  await prisma.notification.deleteMany({ where: { membership: { orgId } } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "org.data_reset",
    targetType: "Organization",
    targetId: orgId,
    metadata: {
      teamMemberships: teamMemberships.count,
      matches: matches.count,
      practiceSessions: sessions.count,
      prospects: prospects.count,
      announcements: announcements.count,
      conversations: conversations.count,
    },
  });

  revalidatePath(`/${orgSlug}`, "layout");
  return { success: "Organization data reset. Teams, roles, members, and venues were kept." };
}
