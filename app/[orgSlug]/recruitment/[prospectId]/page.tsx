import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageSelect } from "@/components/recruitment/stage-select";
import { DeleteProspectButton } from "@/components/recruitment/delete-prospect-button";
import { InviteProspectDialog } from "@/components/recruitment/invite-prospect-dialog";
import { Mail, Phone, MessageSquare, Pencil, ExternalLink, UserCheck, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils/format-time";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; prospectId: string }>;
}) {
  const { orgSlug, prospectId } = await params;
  const { session, org, membership } = await getOrgContext(orgSlug);
  const viewerTz = session.user.timezone ?? org.timezone;
  requirePagePermission(orgSlug, membership, Permission.recruitment_view);

  const prospect = await prisma.recruitmentProspect.findUnique({
    where: { id: prospectId },
    include: {
      team: true,
      level: true,
      assignedTo: { include: { user: true } },
      statusHistory: { orderBy: { changedAt: "desc" }, include: { changedBy: { include: { user: true } } } },
    },
  });
  if (!prospect || prospect.orgId !== org.id) notFound();

  const canManage = membership.permissions.includes(Permission.recruitment_manage);
  const canDelete = membership.permissions.includes(Permission.recruitment_delete);
  const canInvite = membership.permissions.includes(Permission.org_members_invite);

  const [roles, existingMembership, pendingInvite] = await Promise.all([
    canInvite ? prisma.role.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    canInvite && prospect.email
      ? prisma.membership.findFirst({ where: { orgId: org.id, user: { email: prospect.email } } })
      : Promise.resolve(null),
    canInvite && prospect.email
      ? prisma.invite.findFirst({ where: { orgId: org.id, email: prospect.email, status: "PENDING" } })
      : Promise.resolve(null),
  ]);

  const statsLinks = parseLinksForDisplay(prospect.statsLinks);
  const socialLinks = parseLinksForDisplay(prospect.socialLinks);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{prospect.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            {prospect.level ? <Badge variant="secondary">{prospect.level.name}</Badge> : null}
            <span className="text-sm text-muted-foreground">{prospect.game}</span>
            {prospect.team ? <Badge variant="outline">{prospect.team.name}</Badge> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canInvite && prospect.email ? (
            existingMembership ? (
              <Badge variant="secondary" className="gap-1">
                <UserCheck className="size-3" />
                Already a member
              </Badge>
            ) : pendingInvite ? (
              <Badge variant="outline" className="gap-1">
                <Clock className="size-3" />
                Invite pending
              </Badge>
            ) : (
              <InviteProspectDialog
                orgSlug={orgSlug}
                orgId={org.id}
                prospectName={prospect.name}
                prospectEmail={prospect.email}
                roles={roles}
              />
            )
          ) : null}
          {canManage ? <StageSelect orgSlug={orgSlug} orgId={org.id} prospectId={prospect.id} stage={prospect.stage} /> : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {prospect.email ? (
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              {prospect.email}
            </div>
          ) : null}
          {prospect.phone ? (
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              {prospect.phone}
            </div>
          ) : null}
          {prospect.discordHandle ? (
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-muted-foreground" />
              {prospect.discordHandle}
            </div>
          ) : null}
          {prospect.schoolOrOrg ? <p className="text-muted-foreground">{prospect.schoolOrOrg}</p> : null}
          {!prospect.email && !prospect.phone && !prospect.discordHandle ? (
            <p className="text-muted-foreground">No contact info yet.</p>
          ) : null}
          {canInvite && !prospect.email ? (
            <p className="text-xs text-muted-foreground">
              Add an email (<Link href={`/${orgSlug}/recruitment/${prospect.id}/edit`} className="underline underline-offset-4">edit prospect</Link>) to invite them.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {statsLinks.length > 0 || socialLinks.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 text-sm">
            {[...statsLinks, ...socialLinks].map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-primary underline underline-offset-4"
              >
                {link.label}
                <ExternalLink className="size-3" />
              </a>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {prospect.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{prospect.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {prospect.statusHistory.map((h) => (
            <div key={h.id} className="flex items-center justify-between text-sm">
              <span>
                {h.fromStage ? `${h.fromStage} → ` : ""}
                <strong>{h.toStage}</strong>
                {h.note ? ` — ${h.note}` : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                {h.changedBy.user.name} · {formatDate(h.changedAt, viewerTz)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {canManage || canDelete ? (
        <div className="flex gap-2">
          {canManage ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${orgSlug}/recruitment/${prospect.id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
          ) : null}
          {canDelete ? <DeleteProspectButton orgSlug={orgSlug} orgId={org.id} prospectId={prospect.id} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function parseLinksForDisplay(json: unknown): { label: string; url: string }[] {
  if (!Array.isArray(json)) return [];
  return json.filter(
    (l): l is { label: string; url: string } => !!l && typeof l === "object" && "label" in l && "url" in l,
  );
}
