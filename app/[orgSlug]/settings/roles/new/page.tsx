import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { RoleForm } from "@/components/settings/role-form";
import { createRoleAction } from "@/lib/actions/roles";

export default async function NewRolePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.org_roles_manage);

  const action = createRoleAction.bind(null, orgSlug, org.id);

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">New role</h2>
      <RoleForm action={action} />
    </div>
  );
}
