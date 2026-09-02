import "server-only";

// Riot's API is split into two routing schemes: Account-v1 (identity — Riot ID to PUUID) is
// queried through one of three continental clusters and is region-agnostic for the account
// itself; League-v4 (ranked standing) is queried per-platform-shard (na1, euw1, kr, ...), which
// Riot doesn't expose from the PUUID alone. Since this app runs one org per deployment, the
// platform shard is a single env var rather than something asked per-player.
//
// NOTE: this has not been exercised against a live RIOT_API_KEY — verify it once one is
// configured. Also note Riot's official API does not expose ranked data for VALORANT to
// personal/development keys in practice, so this only covers League of Legends for now; the
// existing tracker-link fields remain the way to surface Valorant stats.

const ACCOUNT_ROUTE = "americas";

export type RiotRankResult = {
  gameName: string;
  tagLine: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
};

function riotHeaders(): Record<string, string> {
  return { "X-Riot-Token": process.env.RIOT_API_KEY! };
}

/** Looks up League of Legends solo-queue rank for a Riot ID formatted "Name#TAG" (Formation's
 *  TeamMembership.inGameName). Returns null if unranked/not found rather than throwing, since
 *  that's an expected, common state — throws only on actual API/config failure. */
export async function getLeagueRank(riotId: string): Promise<RiotRankResult | null> {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) throw new Error("RIOT_API_KEY isn't configured for this deployment.");

  const platform = process.env.RIOT_PLATFORM || "na1";
  const [gameName, tagLine] = riotId.split("#");
  if (!gameName || !tagLine) throw new Error('Riot ID must be in the form "Name#TAG".');

  const accountRes = await fetch(
    `https://${ACCOUNT_ROUTE}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    { headers: riotHeaders() },
  );
  if (accountRes.status === 404) return null;
  if (!accountRes.ok) throw new Error(`Riot account lookup failed (${accountRes.status}).`);
  const account = (await accountRes.json()) as { puuid: string; gameName: string; tagLine: string };

  const leagueRes = await fetch(`https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${account.puuid}`, {
    headers: riotHeaders(),
  });
  if (!leagueRes.ok) throw new Error(`Riot league lookup failed (${leagueRes.status}).`);
  const entries = (await leagueRes.json()) as {
    queueType: string;
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
  }[];

  const solo = entries.find((e) => e.queueType === "RANKED_SOLO_5x5") ?? entries[0];
  if (!solo) return null;

  return {
    gameName: account.gameName,
    tagLine: account.tagLine,
    queueType: solo.queueType,
    tier: solo.tier,
    rank: solo.rank,
    leaguePoints: solo.leaguePoints,
    wins: solo.wins,
    losses: solo.losses,
  };
}
