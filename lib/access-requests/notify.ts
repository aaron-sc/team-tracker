import "server-only";
import { sendDiscordWebhook, FORMATION_EMBED_COLOR } from "@/lib/integrations/discord";
import { postAccessRequestForReview } from "@/lib/integrations/discord-bot";
import { signDecision } from "@/lib/access-requests/service";
import { getBackgroundBaseUrl } from "@/lib/utils/base-url";

export type AccessRequestNotifyPayload = {
  token: string;
  name: string;
  email: string;
  role: string;
  orgName: string;
  websiteUrl: string | null;
  discordInvite: string | null;
  games: string;
  rosterSize: string | null;
  reason: string;
  referral: string | null;
  ip: string | null;
};

/**
 * Routes a new access request to whoever approves them, best-effort (never throws — a Discord
 * outage must not fail the request submission):
 *   1. Discord bot posts to ACCESS_REQUEST_DISCORD_CHANNEL_ID with Approve/Deny buttons.
 *   2. Otherwise a plain webhook (ACCESS_REQUEST_DISCORD_WEBHOOK_URL, then FEEDBACK_…) with
 *      signed approve/deny links in the body — no buttons, but still one-click.
 *   3. Otherwise just log the approve link so it's still actionable from the server logs.
 */
export async function notifyAccessRequest(req: AccessRequestNotifyPayload, requestBaseUrl: string | null) {
  const base = (requestBaseUrl ?? getBackgroundBaseUrl())?.replace(/\/$/, "") ?? null;
  const approveUrl = base
    ? `${base}/api/access-requests/decide?token=${req.token}&action=approve&sig=${signDecision(req.token, "approve")}`
    : null;
  const denyUrl = base
    ? `${base}/api/access-requests/decide?token=${req.token}&action=deny&sig=${signDecision(req.token, "deny")}`
    : null;

  try {
    const posted = await postAccessRequestForReview(req, { approveUrl, denyUrl });
    if (posted) return;
  } catch (err) {
    console.error("[access-request] bot post failed:", err);
  }

  const webhookUrl =
    process.env.ACCESS_REQUEST_DISCORD_WEBHOOK_URL || process.env.FEEDBACK_DISCORD_WEBHOOK_URL;

  if (webhookUrl) {
    const fields = [
      { name: "Email", value: req.email, inline: true },
      { name: "Name", value: req.name, inline: true },
      { name: "Their role", value: req.role, inline: true },
      { name: "Org", value: req.orgName, inline: true },
      { name: "Game(s)", value: req.games || "—", inline: true },
      { name: "Roster size", value: req.rosterSize || "—", inline: true },
      { name: "Website", value: req.websiteUrl || "—", inline: true },
      { name: "Discord invite", value: req.discordInvite || "—", inline: true },
      { name: "Heard about us via", value: req.referral || "—", inline: true },
      { name: "IP", value: req.ip || "—", inline: true },
      { name: "Why they want in", value: req.reason.slice(0, 1024) },
    ];
    if (approveUrl) fields.push({ name: "✅ Approve", value: approveUrl });
    if (denyUrl) fields.push({ name: "⛔ Deny", value: denyUrl });

    const result = await sendDiscordWebhook(webhookUrl, {
      embeds: [
        {
          title: "New Formation access request",
          color: FORMATION_EMBED_COLOR,
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    });
    if (!result.ok) console.error("[access-request] webhook post failed:", result.error);
    return;
  }

  console.warn(
    `[access-request] No Discord bot channel or webhook configured — approve ${req.email} manually. ` +
      (approveUrl ? `Approve: ${approveUrl}` : "Set APP_URL to generate a one-click approve link."),
  );
}
