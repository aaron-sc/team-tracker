"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { roleSchema } from "@/lib/validations/org";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

export async function createRoleAction(
  orgSlug: string,
  orgId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.org_roles_manage);

  const parsed = roleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    color: formData.get("color") ?? "",
    permissions: formData.getAll("permissions"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await prisma.role.findUnique({ where: { orgId_name: { orgId, name: parsed.data.name } } });
  if (existing) {
    return { error: "A role with that name already exists." };
  }

  const role = await prisma.role.create({
    data: {
      orgId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      color: parsed.data.color || null,
      permissions: { create: parsed.data.permissions.map((permission) => ({ permission })) },
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "role.created",
    targetType: "Role",
    targetId: role.id,
    metadata: { name: role.name, permissions: parsed.data.permissions },
  });

  redirect(`/${orgSlug}/settings/roles`);
}

export async function updateRoleAction(
  orgSlug: string,
  orgId: string,
  roleId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.org_roles_manage);

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role || role.orgId !== orgId) {
    return { error: "Role not found." };
  }

  const parsed = roleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    color: formData.get("color") ?? "",
    permissions: formData.getAll("permissions"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Owner role always keeps every permission, regardless of what was submitted.
  const permissions =
    role.isSystem && role.name === "Owner" ? Object.values(Permission) : parsed.data.permissions;

  await prisma.$transaction([
    prisma.role.update({
      where: { id: roleId },
      data: {
        name: role.isSystem ? role.name : parsed.data.name,
        description: parsed.data.description || null,
        color: parsed.data.color || null,
      },
    }),
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({ roleId, permission })),
    }),
  ]);

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "role.permissions_updated",
    targetType: "Role",
    targetId: roleId,
    metadata: { name: role.name, permissions },
  });

  revalidatePath(`/${orgSlug}/settings/roles`);
  redirect(`/${orgSlug}/settings/roles`);
}

export async function deleteRoleAction(orgSlug: string, orgId: string, roleId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.org_roles_manage);

  const role = await prisma.role.findUnique({ where: { id: roleId }, include: { memberships: true } });
  if (!role || role.orgId !== orgId) {
    return { error: "Role not found." };
  }
  if (role.isSystem) {
    return { error: "System roles can't be deleted." };
  }
  if (role.memberships.length > 0) {
    return { error: "Reassign members off this role before deleting it." };
  }

  await prisma.role.delete({ where: { id: roleId } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "role.deleted",
    targetType: "Role",
    targetId: roleId,
    metadata: { name: role.name },
  });

  revalidatePath(`/${orgSlug}/settings/roles`);
}
