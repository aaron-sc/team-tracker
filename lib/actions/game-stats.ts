"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireMembership } from "@/lib/auth/authorize";
import { getLeagueRank } from "@/lib/integrations/riot";
import { getSteamProfile } from "@/lib/integrations/steam";
import { getValorantStats } from "@/lib/integrations/henrikdev";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

const RIOT_GAMES = new Set(["League of Legends"]);
const STEAM_GAMES = new Set(["Counter-Strike 2", "Dota 2"]);
const VALORANT_GAMES = new Set(["Valorant"]);

/** Fetches fresh stats for one roster slot from whichever provider matches the team's game, and
 *  caches the result (TeamMembership.gameStatsCache) — fetched on demand rather than kept live,
 *  to stay well within external API rate limits. */
export async function syncPlayerGameStatsAction(
  orgSlug: string,
  orgId: string,
  teamMembershipId: string,
  membershipPageId: string,
): Promise<ActionState> {
  const { membership: actor } = await requireMembership(orgId);

  const entry = await prisma.teamMembership.findUnique({ where: { id: teamMembershipId }, include: { team: true, membership: true } });
  if (!entry || entry.membership.orgId !== orgId) return { error: "Roster entry not found." };
  // A sync can autofill `rank` (see the Valorant branch below), which is otherwise subject to
  // per-team self-edit permissions — so this needs the same "self or roster manager" gate as
  // updateRosterEntryAction, not just any org membership.
  const isSelf = actor.membershipId === entry.membershipId;
  const isManager = actor.permissions.includes(Permission.roster_manage);
  if (!isSelf && !isManager) return { error: "You don't have permission to sync this roster entry." };
  if (!entry.inGameName) return { error: "Set an in-game name on this roster entry first." };

  try {
    if (RIOT_GAMES.has(entry.team.game)) {
      if (!process.env.RIOT_API_KEY) return { error: "Riot API isn't configured for this deployment." };
      const rank = await getLeagueRank(entry.inGameName);
      if (!rank) return { error: `No ranked data found for "${entry.inGameName}".` };
      await prisma.teamMembership.update({
        where: { id: teamMembershipId },
        data: { gameStatsCache: { provider: "riot", ...rank }, gameStatsUpdatedAt: new Date() },
      });
    } else if (STEAM_GAMES.has(entry.team.game)) {
      if (!process.env.STEAM_API_KEY) return { error: "Steam API isn't configured for this deployment." };
      const profile = await getSteamProfile(entry.inGameName);
      if (!profile) return { error: `No Steam profile found for "${entry.inGameName}".` };
      await prisma.teamMembership.update({
        where: { id: teamMembershipId },
        data: { gameStatsCache: { provider: "steam", ...profile }, gameStatsUpdatedAt: new Date() },
      });
    } else if (VALORANT_GAMES.has(entry.team.game)) {
      if (!process.env.HENRIKDEV_API_KEY) return { error: "Valorant API isn't configured for this deployment." };
      // HenrikDev's Basic tier is a shared 30 req/min across this whole deployment (each sync
      // costs two calls) — a per-org limiter here keeps one org's syncing from starving everyone
      // else's, on top of the API's own 429 if the shared budget is actually exhausted.
      const allowed = await checkRateLimit(`valorant_sync:${orgId}`, 10, 60 * 1000);
      if (!allowed) return { error: "Too many Valorant syncs right now — try again in a minute." };
      const stats = await getValorantStats(entry.inGameName);
      if (!stats) return { error: `No Valorant account found for "${entry.inGameName}".` };
      await prisma.teamMembership.update({
        where: { id: teamMembershipId },
        data: {
          gameStatsCache: { provider: "valorant", ...stats },
          gameStatsUpdatedAt: new Date(),
          // Autofills the same `rank` field RankSelect/averageRank use — "Unrated" (no ranked
          // games played yet) is deliberately left alone rather than clobbering a real rank.
          ...(stats.tier !== "Unrated" ? { rank: stats.tier } : {}),
        },
      });
    } else {
      return { error: `Stats sync isn't available for ${entry.team.game} yet.` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sync failed." };
  }

  revalidatePath(`/${orgSlug}/roster/${membershipPageId}`);
  revalidatePath(`/${orgSlug}/teams`);
  return { success: "Stats synced." };
}
