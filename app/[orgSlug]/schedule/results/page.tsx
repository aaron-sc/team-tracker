import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Radio, Trophy, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils/format-time";

const RESULT_VARIANT: Record<string, "default" | "destructive" | "secondary"> = {
  WIN: "default",
  LOSS: "destructive",
  DRAW: "secondary",
};

export default async function MatchResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ team?: string }>;
}) {
  const { orgSlug } = await params;
  const { team } = await searchParams;
  const { session, org, teams } = await getOrgContext(orgSlug);
  const viewerTz = session.user.timezone ?? org.timezone;

  const visibleTeamIds = teams.map((t) => t.id);
  const requestedTeam = team && visibleTeamIds.includes(team) ? team : undefined;
  const teamWhere = requestedTeam
    ? { teamId: requestedTeam, team: { orgId: org.id } }
    : { teamId: { in: visibleTeamIds }, team: { orgId: org.id } };

  const [matches, scrims] = await Promise.all([
    prisma.match.findMany({
      where: { status: "COMPLETED", ...teamWhere },
      include: { team: true, opponent: true },
      orderBy: { scheduledAt: "desc" },
      take: 100,
    }),
    prisma.practiceSession.findMany({
      where: { type: "SCRIM", resultStatus: { not: null }, ...teamWhere },
      include: { team: true, opponent: true },
      orderBy: { scheduledAt: "desc" },
      take: 100,
    }),
  ]);

  const results = [
    ...matches.map((m) => ({
      id: m.id,
      kind: "match" as const,
      href: `/${orgSlug}/schedule/matches/${m.id}`,
      teamName: m.team.name,
      opponentName: m.opponent.name,
      scheduledAt: m.scheduledAt,
      subtitle: m.format,
      isStreamed: m.isStreamed,
      resultStatus: m.resultStatus,
      scoreFor: m.scoreFor,
      scoreAgainst: m.scoreAgainst,
    })),
    ...scrims.map((s) => ({
      id: s.id,
      kind: "scrim" as const,
      href: `/${orgSlug}/schedule/practice/${s.id}`,
      teamName: s.team.name,
      opponentName: s.opponent?.name ?? "Unknown opponent",
      scheduledAt: s.scheduledAt,
      subtitle: "Scrim",
      isStreamed: false,
      resultStatus: s.resultStatus,
      scoreFor: s.scoreFor,
      scoreAgainst: s.scoreAgainst,
    })),
  ].sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());

  const record = results.reduce(
    (acc, r) => {
      if (r.resultStatus === "WIN") acc.wins += 1;
      else if (r.resultStatus === "LOSS") acc.losses += 1;
      else if (r.resultStatus === "DRAW") acc.draws += 1;
      return acc;
    },
    { wins: 0, losses: 0, draws: 0 },
  );

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={`/${orgSlug}/schedule`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Results</h1>
            <p className="text-sm text-muted-foreground">
              {results.length === 0
                ? "No completed matches or scrims yet."
                : `${record.wins}W – ${record.losses}L${record.draws ? ` – ${record.draws}D` : ""}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border text-sm">
            <Link
              href={`/${orgSlug}/schedule/results`}
              className={cn("px-3 py-1.5", !team ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
            >
              All teams
            </Link>
            {teams.map((t) => (
              <Link
                key={t.id}
                href={`/${orgSlug}/schedule/results?team=${t.id}`}
                className={cn("px-3 py-1.5", team === t.id ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
              >
                {t.name}
              </Link>
            ))}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${orgSlug}/schedule/results/opponents${team ? `?team=${team}` : ""}`}>
              <Swords className="size-4" />
              By opponent
            </Link>
          </Button>
        </div>
      </div>

      {results.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Trophy}
              message="Nothing recorded yet — results are added from a match's or scrim's detail page."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {results.map((r) => (
            <Link key={`${r.kind}-${r.id}`} href={r.href}>
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {r.teamName} vs {r.opponentName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.scheduledAt, viewerTz)} · {r.subtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.isStreamed ? <Radio className="size-3.5 text-muted-foreground" /> : null}
                    {r.resultStatus ? (
                      <Badge variant={RESULT_VARIANT[r.resultStatus]}>
                        {r.resultStatus} {r.scoreFor ?? "?"}–{r.scoreAgainst ?? "?"}
                      </Badge>
                    ) : (
                      <Badge variant="outline">No score recorded</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
