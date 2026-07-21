import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, Gamepad2 } from "lucide-react";

export default async function TeamsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);

  const teams = await prisma.team.findMany({
    where: { orgId: org.id },
    include: { _count: { select: { teamMemberships: true } } },
    orderBy: { name: "asc" },
  });

  const canCreate = membership.permissions.includes(Permission.team_create);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {teams.length} team{teams.length === 1 ? "" : "s"}
        </p>
        {canCreate ? (
          <Button size="sm" asChild>
            <Link href={`/${orgSlug}/teams/new`}>
              <Plus className="size-4" />
              New team
            </Link>
          </Button>
        ) : null}
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">No teams yet.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link key={team.id} href={`/${orgSlug}/teams/${team.slug}`}>
              <Card className="h-full transition-colors hover:bg-accent">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    {team.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Gamepad2 className="size-4" />
                    {team.game}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="size-4" />
                    {team._count.teamMemberships}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
