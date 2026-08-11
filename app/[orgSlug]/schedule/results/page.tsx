import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const { org, teams } = await getOrgContext(orgSlug);

  const teamWhere = team ? { teamId: team, team: { orgId: org.id } } : { team: { orgId: org.id } };

  const matches = await prisma.match.findMany({
    where: { status: "COMPLETED", ...teamWhere },
    include: { team: true, opponent: true },
    orderBy: { scheduledAt: "desc" },
    take: 100,
  });

  const record = matches.reduce(
    (acc, m) => {
      if (m.resultStatus === "WIN") acc.wins += 1;
      else if (m.resultStatus === "LOSS") acc.losses += 1;
      else if (m.resultStatus === "DRAW") acc.draws += 1;
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
            <h1 className="text-lg font-semibold">Match results</h1>
            <p className="text-sm text-muted-foreground">
              {matches.length === 0
                ? "No completed matches yet."
                : `${record.wins}W – ${record.losses}L${record.draws ? ` – ${record.draws}D` : ""}`}
            </p>
          </div>
        </div>

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
      </div>

      {matches.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nothing recorded yet — results are added from a match&apos;s detail page.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => (
            <Link key={m.id} href={`/${orgSlug}/schedule/matches/${m.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {m.team.name} vs {m.opponent.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.scheduledAt.toLocaleDateString(undefined, { dateStyle: "medium" })} · {m.format}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.isStreamed ? <Radio className="size-3.5 text-muted-foreground" /> : null}
                    {m.resultStatus ? (
                      <Badge variant={RESULT_VARIANT[m.resultStatus]}>
                        {m.resultStatus} {m.scoreFor ?? "?"}–{m.scoreAgainst ?? "?"}
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
