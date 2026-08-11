import "server-only";

type DiscordEmbed = {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
};

type DiscordPayload = { content?: string; embeds?: DiscordEmbed[] };

export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordPayload,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Discord returned ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to reach Discord." };
  }
}

/**
 * Fire-and-forget: posts to the org's webhook if one is configured. Swallows failures (logs
 * only) so a Discord outage never blocks the caller's action (announcement/match creation, etc).
 */
export async function notifyDiscord(webhookUrl: string | null | undefined, payload: DiscordPayload) {
  if (!webhookUrl) return;
  const result = await sendDiscordWebhook(webhookUrl, payload);
  if (!result.ok) {
    console.error("[discord] webhook post failed:", result.error);
  }
}

export const FORMATION_EMBED_COLOR = 0x6366f1;
