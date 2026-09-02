import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowLeft, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function OpponentRecordsPage({
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
    include: { opponent: true },
  });

  const byOpponent = new Map<
    string,
    { name: string; wins: number; losses: number; draws: number; scoreFor: number; scoreAgainst: number }
  >();
  for (const m of matches) {
    const entry = byOpponent.get(m.opponentId) ?? {
      name: m.opponent.name,
      wins: 0,
      losses: 0,
      draws: 0,
      scoreFor: 0,
      scoreAgainst: 0,
    };
    if (m.resultStatus === "WIN") entry.wins += 1;
    else if (m.resultStatus === "LOSS") entry.losses += 1;
    else if (m.resultStatus === "DRAW") entry.draws += 1;
    if (m.scoreFor != null) entry.scoreFor += m.scoreFor;
    if (m.scoreAgainst != null) entry.scoreAgainst += m.scoreAgainst;
    byOpponent.set(m.opponentId, entry);
  }
  const rows = Array.from(byOpponent.values()).sort((a, b) => b.wins + b.losses + b.draws - (a.wins + a.losses + a.draws));

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={`/${orgSlug}/schedule/results`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Head-to-head records</h1>
            <p className="text-sm text-muted-foreground">Completed match results grouped by opponent.</p>
          </div>
        </div>

        <div className="flex overflow-hidden rounded-md border text-sm">
          <Link
            href={`/${orgSlug}/schedule/results/opponents`}
            className={cn("px-3 py-1.5", !team ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
          >
            All teams
          </Link>
          {teams.map((t) => (
            <Link
              key={t.id}
              href={`/${orgSlug}/schedule/results/opponents?team=${t.id}`}
              className={cn("px-3 py-1.5", team === t.id ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
            >
              {t.name}
            </Link>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={Swords} message="No completed matches with recorded results yet." />
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Opponent</TableHead>
              <TableHead>Record</TableHead>
              <TableHead>Win %</TableHead>
              <TableHead>Score for/against</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const total = r.wins + r.losses + r.draws;
              const winPct = total > 0 ? Math.round((r.wins / total) * 100) : 0;
              return (
                <TableRow key={r.name}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.wins}W – {r.losses}L{r.draws ? ` – ${r.draws}D` : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{winPct}%</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.scoreFor}–{r.scoreAgainst}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
