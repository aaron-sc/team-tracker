import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ACTION_LABELS: Record<string, string> = {
  "role.created": "Role created",
  "role.permissions_updated": "Role permissions updated",
  "role.deleted": "Role deleted",
  "invite.created": "Invite created",
  "invite.revoked": "Invite revoked",
  "member.role_changed": "Member role changed",
  "member.removed": "Member removed",
  "org.settings_updated": "Organization settings updated",
};

export default async function AuditLogPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.audit_log_view);

  const entries = await prisma.auditLog.findMany({
    where: { orgId: org.id },
    include: { actorMembership: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {entry.createdAt.toLocaleString()}
            </TableCell>
            <TableCell>{entry.actorMembership?.user.name ?? "System"}</TableCell>
            <TableCell>{ACTION_LABELS[entry.action] ?? entry.action}</TableCell>
            <TableCell className="max-w-md truncate text-muted-foreground">
              {entry.metadata ? JSON.stringify(entry.metadata) : ""}
            </TableCell>
          </TableRow>
        ))}
        {entries.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              No audit events yet.
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
    </Table>
  );
}
