"use client";

import { useTransition } from "react";
import { syncPlayerGameStatsAction } from "@/lib/actions/game-stats";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, Loader2, Gamepad2 } from "lucide-react";

type RiotStats = { provider: "riot"; tier: string; rank: string; leaguePoints: number; wins: number; losses: number };
type SteamStats = { provider: "steam"; personaName: string; status: string; profileUrl: string };
type GameStats = RiotStats | SteamStats;

export function GameStatsPanel({
  orgSlug,
  orgId,
  teamMembershipId,
  membershipPageId,
  stats,
  updatedAt,
}: {
  orgSlug: string;
  orgId: string;
  teamMembershipId: string;
  membershipPageId: string;
  stats: GameStats | null;
  updatedAt: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2 text-xs">
      {stats?.provider === "riot" ? (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Gamepad2 className="size-3" />
          {stats.tier} {stats.rank} · {stats.leaguePoints} LP · {stats.wins}W-{stats.losses}L
        </span>
      ) : stats?.provider === "steam" ? (
        <a
          href={stats.profileUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-primary underline underline-offset-4"
        >
          <Gamepad2 className="size-3" />
          {stats.personaName} · {stats.status}
        </a>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-1.5"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await syncPlayerGameStatsAction(orgSlug, orgId, teamMembershipId, membershipPageId);
            if (result?.error) toast.error(result.error);
            else toast.success(result?.success ?? "Synced.");
          })
        }
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
        {stats ? "Refresh" : "Sync stats"}
      </Button>
      {updatedAt ? <span className="text-muted-foreground">as of {new Date(updatedAt).toLocaleDateString()}</span> : null}
    </div>
  );
}
