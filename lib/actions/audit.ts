"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";
import { AUDIT_RETENTION_OPTIONS } from "@/lib/constants/audit-retention";

export async function updateAuditRetentionAction(
  orgSlug: string,
  orgId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.org_settings_manage);

  const value = formData.get("retention");
  const option = AUDIT_RETENTION_OPTIONS.find((o) => o.value === value);
  if (!option) return { error: "Invalid retention option." };

  await prisma.organization.update({ where: { id: orgId }, data: { auditLogRetentionDays: option.days } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "org.audit_retention_updated",
    targetType: "Organization",
    targetId: orgId,
    metadata: { retentionDays: option.days },
  });

  revalidatePath(`/${orgSlug}/settings/audit-log`);
  return { success: "Retention setting saved." };
}
