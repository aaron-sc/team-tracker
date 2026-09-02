import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GearItemDialog } from "@/components/gear/gear-item-dialog";
import { DeleteGearItemButton } from "@/components/gear/delete-gear-item-button";
import { Package } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Available",
  ASSIGNED: "Assigned",
  MAINTENANCE: "In maintenance",
  LOST: "Lost",
  RETIRED: "Retired",
};
const STATUS_CLASS: Record<string, string> = {
  AVAILABLE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  ASSIGNED: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  MAINTENANCE: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  LOST: "border-destructive/30 bg-destructive/10 text-destructive",
  RETIRED: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

export default async function GearPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.gear_manage);

  const [items, members, teams] = await Promise.all([
    prisma.gearItem.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
      include: { assignedToMembership: { include: { user: true } }, assignedToTeam: true },
    }),
    prisma.membership.findMany({ where: { orgId: org.id }, include: { user: true }, orderBy: { user: { name: "asc" } } }),
    prisma.team.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
  ]);

  const memberOptions = members.map((m) => ({ id: m.id, name: m.user.name }));
  const teamOptions = teams.map((t) => ({ id: t.id, name: t.name }));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} item{items.length === 1 ? "" : "s"}
        </p>
        <GearItemDialog orgSlug={orgSlug} orgId={org.id} members={memberOptions} teams={teamOptions} />
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={Package} message="No gear tracked yet." />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[item.category, item.serialNumber ? `#${item.serialNumber}` : null].filter(Boolean).join(" · ") || "—"}
                      {item.assignedToMembership ? ` · ${item.assignedToMembership.user.name}` : ""}
                      {item.assignedToTeam ? ` · ${item.assignedToTeam.name}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={STATUS_CLASS[item.status]}>
                    {STATUS_LABEL[item.status]}
                  </Badge>
                  <GearItemDialog
                    orgSlug={orgSlug}
                    orgId={org.id}
                    members={memberOptions}
                    teams={teamOptions}
                    item={{
                      id: item.id,
                      name: item.name,
                      category: item.category,
                      serialNumber: item.serialNumber,
                      status: item.status,
                      assignedToMembershipId: item.assignedToMembershipId,
                      assignedToTeamId: item.assignedToTeamId,
                      notes: item.notes,
                    }}
                  />
                  <DeleteGearItemButton orgSlug={orgSlug} orgId={org.id} gearItemId={item.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
