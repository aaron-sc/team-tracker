import "server-only";

// NOTE: not exercised against a live STEAM_API_KEY — verify once one is configured.

export type SteamProfileResult = {
  steamId: string;
  personaName: string;
  profileUrl: string;
  avatarUrl: string;
  status: "Offline" | "Online" | "Busy" | "Away" | "Snooze" | "Looking to trade" | "Looking to play" | "Unknown";
};

const PERSONA_STATE_LABELS: SteamProfileResult["status"][] = [
  "Offline",
  "Online",
  "Busy",
  "Away",
  "Snooze",
  "Looking to trade",
  "Looking to play",
];

async function resolveSteamId(idOrVanity: string, apiKey: string): Promise<string | null> {
  if (/^\d{17}$/.test(idOrVanity)) return idOrVanity;

  const res = await fetch(
    `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${apiKey}&vanityurl=${encodeURIComponent(idOrVanity)}`,
  );
  if (!res.ok) throw new Error(`Steam vanity lookup failed (${res.status}).`);
  const data = (await res.json()) as { response: { success: number; steamid?: string } };
  return data.response.success === 1 && data.response.steamid ? data.response.steamid : null;
}

/** Looks up a Steam profile by SteamID64 or vanity URL name (whatever's stored in
 *  TeamMembership.inGameName for a Steam-based game). Returns null if not found. */
export async function getSteamProfile(idOrVanity: string): Promise<SteamProfileResult | null> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) throw new Error("STEAM_API_KEY isn't configured for this deployment.");

  const steamId = await resolveSteamId(idOrVanity.trim(), apiKey);
  if (!steamId) return null;

  const res = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`);
  if (!res.ok) throw new Error(`Steam profile lookup failed (${res.status}).`);
  const data = (await res.json()) as {
    response: { players: { steamid: string; personaname: string; profileurl: string; avatarfull: string; personastate: number }[] };
  };
  const player = data.response.players[0];
  if (!player) return null;

  return {
    steamId: player.steamid,
    personaName: player.personaname,
    profileUrl: player.profileurl,
    avatarUrl: player.avatarfull,
    status: PERSONA_STATE_LABELS[player.personastate] ?? "Unknown",
  };
}
