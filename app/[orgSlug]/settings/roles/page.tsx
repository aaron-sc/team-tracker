import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteRoleButton } from "@/components/settings/delete-role-button";
import { Plus } from "lucide-react";

export default async function RolesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.org_roles_manage);

  const roles = await prisma.role.findMany({
    where: { orgId: org.id },
    include: { permissions: true, _count: { select: { memberships: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {roles.length} role{roles.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" asChild>
          <Link href={`/${orgSlug}/settings/roles/new`}>
            <Plus className="size-4" />
            New role
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: role.color ?? "#6366f1" }} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{role.name}</span>
                    {role.isSystem ? (
                      <Badge variant="secondary" className="text-xs">
                        System
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {role.permissions.length} permission{role.permissions.length === 1 ? "" : "s"} ·{" "}
                    {role._count.memberships} member{role._count.memberships === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/${orgSlug}/settings/roles/${role.id}/edit`}>Edit</Link>
                </Button>
                {!role.isSystem ? (
                  <DeleteRoleButton orgSlug={orgSlug} orgId={org.id} roleId={role.id} disabled={role._count.memberships > 0} />
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
