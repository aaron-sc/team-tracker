import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { RosterSearchList } from "@/components/roster/roster-search-list";
import { Download } from "lucide-react";

export default async function RosterPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org } = await getOrgContext(orgSlug);

  const members = await prisma.membership.findMany({
    where: { orgId: org.id },
    include: { user: true, role: true, teamMemberships: { include: { team: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {members.length} member{members.length === 1 ? "" : "s"} in the organization
        </p>
        <Button size="sm" variant="outline" asChild>
          <a href={`/${orgSlug}/roster/export`} download>
            <Download className="size-4" />
            Export CSV
          </a>
        </Button>
      </div>
      <RosterSearchList
        orgSlug={orgSlug}
        members={members.map((m) => ({
          id: m.id,
          name: m.user.name,
          email: m.user.email,
          roleName: m.role.name,
          teamNames: m.teamMemberships.map((tm) => tm.team.name),
        }))}
      />
    </div>
  );
}
