"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireMembership } from "@/lib/auth/authorize";
import { getLeagueRank } from "@/lib/integrations/riot";
import { getSteamProfile } from "@/lib/integrations/steam";
import type { ActionState } from "@/lib/actions/types";

const RIOT_GAMES = new Set(["League of Legends"]);
const STEAM_GAMES = new Set(["Counter-Strike 2", "Dota 2"]);

/** Fetches fresh stats for one roster slot from whichever provider matches the team's game, and
 *  caches the result (TeamMembership.gameStatsCache) — fetched on demand rather than kept live,
 *  to stay well within external API rate limits. */
export async function syncPlayerGameStatsAction(
  orgSlug: string,
  orgId: string,
  teamMembershipId: string,
  membershipPageId: string,
): Promise<ActionState> {
  await requireMembership(orgId);

  const entry = await prisma.teamMembership.findUnique({ where: { id: teamMembershipId }, include: { team: true, membership: true } });
  if (!entry || entry.membership.orgId !== orgId) return { error: "Roster entry not found." };
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
    } else {
      return { error: `Stats sync isn't available for ${entry.team.game} yet.` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sync failed." };
  }

  revalidatePath(`/${orgSlug}/roster/${membershipPageId}`);
  return { success: "Stats synced." };
}
