import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils/format-time";
import { AuditRetentionForm } from "@/components/settings/audit-retention-form";
import { Download } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  "role.created": "Role created",
  "role.permissions_updated": "Role permissions updated",
  "role.deleted": "Role deleted",
  "invite.created": "Invite created",
  "invite.revoked": "Invite revoked",
  "member.role_changed": "Member role changed",
  "member.removed": "Member removed",
  "member.left": "Member left",
  "org.settings_updated": "Organization settings updated",
  "org.audit_retention_updated": "Audit log retention updated",
  "org.data_reset": "Organization data reset",
  "announcement.created": "Announcement posted",
  "announcement.deleted": "Announcement deleted",
  "player_action.benched": "Player benched",
  "player_action.disciplinary_recorded": "Disciplinary action recorded",
  "player_action.deleted": "Player conduct record removed",
};

export default async function AuditLogPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { session, org, membership } = await getOrgContext(orgSlug);
  const viewerTz = session.user.timezone ?? org.timezone;
  const viewerHour12 = session.user.timeFormat !== "24h";
  requirePagePermission(orgSlug, membership, Permission.audit_log_view);
  const canManage = membership.permissions.includes(Permission.org_settings_manage);

  const [entries, orgSettings] = await Promise.all([
    prisma.auditLog.findMany({
      where: { orgId: org.id },
      include: { actorMembership: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.organization.findUnique({ where: { id: org.id }, select: { auditLogRetentionDays: true } }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {canManage ? (
          <AuditRetentionForm orgSlug={orgSlug} orgId={org.id} retentionDays={orgSettings?.auditLogRetentionDays ?? null} />
        ) : (
          <div />
        )}
        <Button size="sm" variant="outline" asChild>
          <a href={`/${orgSlug}/settings/audit-log/export`} download>
            <Download className="size-4" />
            Export CSV
          </a>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>IP address</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDateTime(entry.createdAt, viewerTz, viewerHour12)}
              </TableCell>
              <TableCell>{entry.actorMembership?.user.name ?? "System"}</TableCell>
              <TableCell>{ACTION_LABELS[entry.action] ?? entry.action}</TableCell>
              <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                {entry.ipAddress ?? "—"}
              </TableCell>
              <TableCell
                className="max-w-md truncate text-muted-foreground"
                title={[entry.metadata ? JSON.stringify(entry.metadata) : null, entry.userAgent].filter(Boolean).join("\n")}
              >
                {entry.metadata ? JSON.stringify(entry.metadata) : ""}
              </TableCell>
            </TableRow>
          ))}
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No audit events yet.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
