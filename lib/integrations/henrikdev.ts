import "server-only";

// HenrikDev's unofficial Valorant API (https://docs.henrikdev.xyz) — Riot's own official API does
// not expose ranked data for VALORANT to personal/development keys (see lib/integrations/riot.ts),
// so this is what actually covers Valorant. Auth is the raw API key in the Authorization header —
// no "Bearer" prefix, despite the OpenAPI spec formally listing it as an HTTP bearer scheme
// (verified directly against a live key: "Bearer <key>" gets 401, "<key>" alone gets through).
// Basic keys are rate-limited to 30 req/min account-wide, shared across every org on this
// deployment — fine for an on-demand "sync stats" button, not for anything live/automatic.

const BASE_URL = "https://api.henrikdev.xyz";

export type ValorantStatsResult = {
  name: string;
  tag: string;
  accountLevel: number;
  tier: string; // e.g. "Platinum 3", "Radiant", "Unrated"
  rr: number; // rank rating within the current tier
  peakTier: string | null;
};

function henrikHeaders(): Record<string, string> {
  return { Authorization: process.env.HENRIKDEV_API_KEY! };
}

type AccountResponse = { data: { name: string; tag: string; account_level: number; region: string } };
type MmrResponse = {
  data: {
    current: { tier: { name: string }; rr: number };
    peak: { tier: { name: string } } | null;
  };
};

/** Looks up current Valorant rank for a Riot ID formatted "Name#TAG" (Formation's
 *  TeamMembership.inGameName — the same field League/Steam already use). Returns null if the
 *  account doesn't exist rather than throwing, since that's an expected, common state — throws
 *  only on actual API/config failure. */
export async function getValorantStats(riotId: string): Promise<ValorantStatsResult | null> {
  const apiKey = process.env.HENRIKDEV_API_KEY;
  if (!apiKey) throw new Error("HENRIKDEV_API_KEY isn't configured for this deployment.");

  const [name, tag] = riotId.split("#");
  if (!name || !tag) throw new Error('Riot ID must be in the form "Name#TAG".');

  const accountRes = await fetch(`${BASE_URL}/valorant/v2/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, {
    headers: henrikHeaders(),
  });
  if (accountRes.status === 404) return null;
  if (!accountRes.ok) throw new Error(`Valorant account lookup failed (${accountRes.status}).`);
  const account = (await accountRes.json()) as AccountResponse;

  const mmrRes = await fetch(
    `${BASE_URL}/valorant/v3/mmr/${account.data.region}/pc/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
    { headers: henrikHeaders() },
  );
  if (mmrRes.status === 404) {
    // Account exists but has no ranked data yet (e.g. placements not finished this act).
    return { name: account.data.name, tag: account.data.tag, accountLevel: account.data.account_level, tier: "Unrated", rr: 0, peakTier: null };
  }
  if (!mmrRes.ok) throw new Error(`Valorant rank lookup failed (${mmrRes.status}).`);
  const mmr = (await mmrRes.json()) as MmrResponse;

  return {
    name: account.data.name,
    tag: account.data.tag,
    accountLevel: account.data.account_level,
    tier: mmr.data.current.tier.name,
    rr: mmr.data.current.rr,
    peakTier: mmr.data.peak?.tier.name ?? null,
  };
}
