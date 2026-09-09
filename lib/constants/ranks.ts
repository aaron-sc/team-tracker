/**
 * Per-game rank ladders, lowest to highest — index in the array doubles as a numeric skill
 * value, so averaging a team's ranks is just averaging indices and mapping back to a tier name.
 * Games without a listed ladder fall back to GENERIC_SKILL_SCALE.
 */
export const RANK_TIERS: Record<string, string[]> = {
  Valorant: [
    "Iron 1", "Iron 2", "Iron 3",
    "Bronze 1", "Bronze 2", "Bronze 3",
    "Silver 1", "Silver 2", "Silver 3",
    "Gold 1", "Gold 2", "Gold 3",
    "Platinum 1", "Platinum 2", "Platinum 3",
    "Diamond 1", "Diamond 2", "Diamond 3",
    "Ascendant 1", "Ascendant 2", "Ascendant 3",
    "Immortal 1", "Immortal 2", "Immortal 3",
    "Radiant",
  ],
  "League of Legends": [
    "Iron 4", "Iron 3", "Iron 2", "Iron 1",
    "Bronze 4", "Bronze 3", "Bronze 2", "Bronze 1",
    "Silver 4", "Silver 3", "Silver 2", "Silver 1",
    "Gold 4", "Gold 3", "Gold 2", "Gold 1",
    "Platinum 4", "Platinum 3", "Platinum 2", "Platinum 1",
    "Emerald 4", "Emerald 3", "Emerald 2", "Emerald 1",
    "Diamond 4", "Diamond 3", "Diamond 2", "Diamond 1",
    "Master", "Grandmaster", "Challenger",
  ],
  "Rocket League": [
    "Bronze 1", "Bronze 2", "Bronze 3",
    "Silver 1", "Silver 2", "Silver 3",
    "Gold 1", "Gold 2", "Gold 3",
    "Platinum 1", "Platinum 2", "Platinum 3",
    "Diamond 1", "Diamond 2", "Diamond 3",
    "Champion 1", "Champion 2", "Champion 3",
    "Grand Champion 1", "Grand Champion 2", "Grand Champion 3",
    "Supersonic Legend",
  ],
  "Counter-Strike 2": [
    "Silver 1", "Silver 2", "Silver 3", "Silver 4",
    "Silver Elite", "Silver Elite Master",
    "Gold Nova 1", "Gold Nova 2", "Gold Nova 3", "Gold Nova Master",
    "Master Guardian 1", "Master Guardian 2", "Master Guardian Elite",
    "Distinguished Master Guardian", "Legendary Eagle", "Legendary Eagle Master",
    "Supreme Master First Class", "Global Elite",
  ],
  "Overwatch 2": [
    "Bronze 5", "Bronze 4", "Bronze 3", "Bronze 2", "Bronze 1",
    "Silver 5", "Silver 4", "Silver 3", "Silver 2", "Silver 1",
    "Gold 5", "Gold 4", "Gold 3", "Gold 2", "Gold 1",
    "Platinum 5", "Platinum 4", "Platinum 3", "Platinum 2", "Platinum 1",
    "Diamond 5", "Diamond 4", "Diamond 3", "Diamond 2", "Diamond 1",
    "Master 5", "Master 4", "Master 3", "Master 2", "Master 1",
    "Grandmaster 5", "Grandmaster 4", "Grandmaster 3", "Grandmaster 2", "Grandmaster 1",
    "Champion 5", "Champion 4", "Champion 3", "Champion 2", "Champion 1",
  ],
};

/** Fallback ladder for any game without a defined rank system above. */
export const GENERIC_SKILL_SCALE = ["Beginner", "Casual", "Intermediate", "Competitive", "Advanced", "Semi-Pro", "Pro"];

export function ranksForGame(game: string): string[] {
  return RANK_TIERS[game] ?? GENERIC_SKILL_SCALE;
}

/**
 * Averages a team's ranks for a given game — each rank is looked up by its index in that game's
 * ladder, indices are averaged and rounded to the nearest tier, then mapped back to a name.
 * Ranks that don't match a known tier (stale data from a game/ladder change) are ignored rather
 * than thrown out entirely, so a couple of unrecognized entries don't blank the whole average.
 */
export function averageRank(game: string, ranks: (string | null | undefined)[]): string | null {
  const ladder = ranksForGame(game);
  const indices = ranks
    .filter((r): r is string => !!r)
    .map((r) => ladder.indexOf(r))
    .filter((i) => i >= 0);
  if (indices.length === 0) return null;
  const avgIndex = Math.round(indices.reduce((sum, i) => sum + i, 0) / indices.length);
  return ladder[Math.min(avgIndex, ladder.length - 1)];
}
