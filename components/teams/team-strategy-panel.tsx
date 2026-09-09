"use client";

import { StrategyDialog } from "@/components/teams/strategy-dialog";
import { DeleteStrategyButton } from "@/components/teams/delete-strategy-button";
import { DuplicateStrategyButton } from "@/components/teams/duplicate-strategy-button";
import { Badge } from "@/components/ui/badge";
import { Swords } from "lucide-react";

type AgentRow = { role: string; agent: string };
export type StrategyItem = {
  id: string;
  map: string;
  title: string;
  notes: string | null;
  agents: AgentRow[] | null;
};

export function TeamStrategyPanel({
  orgSlug,
  orgId,
  teamId,
  teamSlug,
  strategies,
  canManage,
}: {
  orgSlug: string;
  orgId: string;
  teamId: string;
  teamSlug: string;
  strategies: StrategyItem[];
  canManage: boolean;
}) {
  const byMap = new Map<string, StrategyItem[]>();
  for (const s of strategies) {
    const list = byMap.get(s.map) ?? [];
    list.push(s);
    byMap.set(s.map, list);
  }

  return (
    <div className="space-y-4">
      {strategies.length === 0 ? (
        <p className="text-sm text-muted-foreground">No strategies logged yet.</p>
      ) : (
        [...byMap.entries()].map(([map, items]) => (
          <div key={map}>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Swords className="size-3" />
              {map}
            </p>
            <div className="space-y-2">
              {items.map((s) => (
                <div key={s.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{s.title}</p>
                    {canManage ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <StrategyDialog orgSlug={orgSlug} orgId={orgId} teamId={teamId} teamSlug={teamSlug} strategy={s} />
                        <DuplicateStrategyButton orgSlug={orgSlug} orgId={orgId} strategyId={s.id} teamSlug={teamSlug} />
                        <DeleteStrategyButton orgSlug={orgSlug} orgId={orgId} strategyId={s.id} teamSlug={teamSlug} />
                      </div>
                    ) : null}
                  </div>
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
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {canManage ? <StrategyDialog orgSlug={orgSlug} orgId={orgId} teamId={teamId} teamSlug={teamSlug} /> : null}
    </div>
  );
}
