import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { RoleForm } from "@/components/settings/role-form";
import { updateRoleAction } from "@/lib/actions/roles";
import { prisma } from "@/lib/db/prisma";

export default async function EditRolePage({
  params,
}: {
  params: Promise<{ orgSlug: string; roleId: string }>;
}) {
  const { orgSlug, roleId } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.org_roles_manage);

  const role = await prisma.role.findUnique({ where: { id: roleId }, include: { permissions: true } });
  if (!role || role.orgId !== org.id) notFound();

  const action = updateRoleAction.bind(null, orgSlug, org.id, role.id);
  const isOwnerRole = role.isSystem && role.name === "Owner";

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">Edit role</h2>
      <RoleForm
        action={action}
        defaultValues={{
          name: role.name,
          description: role.description ?? "",
          color: role.color ?? "#6366f1",
          permissions: role.permissions.map((p) => p.permission),
        }}
        isOwnerRole={isOwnerRole}
        nameLocked={role.isSystem}
      />
    </div>
  );
}
