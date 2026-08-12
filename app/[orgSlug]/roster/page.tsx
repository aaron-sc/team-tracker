import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/print-button";
import { RosterSearchList } from "@/components/roster/roster-search-list";
import { Download, Mail } from "lucide-react";

export default async function RosterPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org } = await getOrgContext(orgSlug);

  const members = await prisma.membership.findMany({
    where: { orgId: org.id },
    include: { user: true, role: true, teamMemberships: { include: { team: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const mailtoHref = `mailto:?bcc=${members.map((m) => encodeURIComponent(m.user.email)).join(",")}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {members.length} member{members.length === 1 ? "" : "s"} in the organization
        </p>
        <div className="no-print flex gap-2">
          {members.length > 0 ? (
            <Button size="sm" variant="outline" asChild>
              <a href={mailtoHref}>
                <Mail className="size-4" />
                Email roster
              </a>
            </Button>
          ) : null}
          <PrintButton label="Print roster" />
          <Button size="sm" variant="outline" asChild>
            <a href={`/${orgSlug}/roster/export`} download>
              <Download className="size-4" />
              Export CSV
            </a>
          </Button>
        </div>
      </div>
      <RosterSearchList
        orgSlug={orgSlug}
        members={members.map((m) => ({
          id: m.id,
          name: m.user.name,
          email: m.user.email,
          avatarUrl: m.user.avatarUrl,
          roleName: m.role.name,
          roleColor: m.role.color,
          teamNames: m.teamMemberships.map((tm) => tm.team.name),
        }))}
      />
    </div>
  );
}
