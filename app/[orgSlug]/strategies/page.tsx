import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamStrategyPanel, type StrategyItem } from "@/components/teams/team-strategy-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Swords } from "lucide-react";

export default async function StrategiesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);

  const canManageStrategy = membership.permissions.includes(Permission.strategy_manage);
  const teams = await prisma.team.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } });

  // Same bar as before: a team's own roster, plus anyone who can manage strategy org-wide (e.g.
  // a head coach overseeing several teams) — not the whole org, since this is competitively
  // sensitive content.
  const visibleTeams = teams.filter((t) => membership.teamIds.includes(t.id) || canManageStrategy);

  const strategiesByTeam = new Map<string, StrategyItem[]>();
  await Promise.all(
    visibleTeams.map(async (team) => {
      const strategies = await prisma.strategy.findMany({
        where: { teamId: team.id },
        orderBy: [{ map: "asc" }, { createdAt: "desc" }],
      });
      strategiesByTeam.set(
        team.id,
        strategies.map((s) => ({
          id: s.id,
          map: s.map,
          title: s.title,
          notes: s.notes,
          agents: (s.agents as { role: string; agent: string }[] | null) ?? null,
        })),
      );
    }),
  );

  return (
    <div className="max-w-3xl space-y-6">
      {visibleTeams.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Swords}
              message={
                teams.length === 0
                  ? "No teams yet."
                  : "You'll see a team's strategy here once you're on its roster."
              }
            />
          </CardContent>
        </Card>
      ) : (
        visibleTeams.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{team.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{team.game}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TeamStrategyPanel
                orgSlug={orgSlug}
                orgId={org.id}
                teamId={team.id}
                teamSlug={team.slug}
                strategies={strategiesByTeam.get(team.id) ?? []}
                canManage={canManageStrategy}
              />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
