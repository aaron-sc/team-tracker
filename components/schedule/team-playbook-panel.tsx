import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Swords } from "lucide-react";

type AgentRow = { role: string; agent: string };
type StrategyItem = { id: string; map: string; title: string; notes: string | null; agents: AgentRow[] | null };

/** Read-only reference view of a team's playbook — shown on that team's upcoming matches and
 *  practices so players can pull up the plan without leaving the page. Full editing happens on
 *  the team page itself. */
export function TeamPlaybookPanel({
  orgSlug,
  teamSlug,
  strategies,
}: {
  orgSlug: string;
  teamSlug: string;
  strategies: StrategyItem[];
}) {
  if (strategies.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No strategies logged for this team yet.{" "}
        <Link href={`/${orgSlug}/teams/${teamSlug}`} className="text-primary underline underline-offset-4">
          Add one
        </Link>
        .
      </p>
    );
  }

  const byMap = new Map<string, StrategyItem[]>();
  for (const s of strategies) {
    const list = byMap.get(s.map) ?? [];
    list.push(s);
    byMap.set(s.map, list);
  }

  return (
    <div className="space-y-3">
      {[...byMap.entries()].map(([map, items]) => (
        <div key={map}>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Swords className="size-3" />
            {map}
          </p>
          <div className="space-y-1.5">
            {items.map((s) => (
              <details key={s.id} className="group rounded-md border p-2.5">
                <summary className="cursor-pointer list-none text-sm font-medium">{s.title}</summary>
                {s.agents && s.agents.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.agents
                      .filter((a) => a.role || a.agent)
                      .map((a, i) => (
                        <Badge key={i} variant="outline" className="font-normal">
                          {a.role ? <span className="text-muted-foreground">{a.role}: </span> : null}
                          {a.agent || "—"}
                        </Badge>
                      ))}
                  </div>
                ) : null}
                {s.notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{s.notes}</p> : null}
              </details>
            ))}
          </div>
        </div>
      ))}
      <Link href={`/${orgSlug}/teams/${teamSlug}`} className="text-xs text-primary underline underline-offset-4">
        Manage strategies
      </Link>
    </div>
  );
}
