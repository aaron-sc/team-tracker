"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { Permission } from "@/lib/generated/prisma/enums";

function generateKey(): string {
  return `fmtn_${crypto.randomBytes(24).toString("base64url")}`;
}

export async function generateApiKeyAction(orgSlug: string, orgId: string): Promise<void> {
  const { membership } = await requirePermission(orgId, Permission.org_settings_manage);

  const apiKey = generateKey();
  await prisma.organization.update({ where: { id: orgId }, data: { apiKey } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "org.api_key_regenerated",
    targetType: "Organization",
    targetId: orgId,
    metadata: {},
  });

  revalidatePath(`/${orgSlug}/settings/integrations`);
}

export async function revokeApiKeyAction(orgSlug: string, orgId: string): Promise<void> {
  const { membership } = await requirePermission(orgId, Permission.org_settings_manage);

  await prisma.organization.update({ where: { id: orgId }, data: { apiKey: null } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "org.api_key_revoked",
    targetType: "Organization",
    targetId: orgId,
    metadata: {},
  });

  revalidatePath(`/${orgSlug}/settings/integrations`);
}
