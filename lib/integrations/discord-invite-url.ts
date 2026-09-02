import "server-only";

// Bot's requested permissions: View Channels, Send Messages, Use Slash Commands, Read Message
// History — enough for slash commands today and a natural home for bot-posted reminders later.
const BOT_PERMISSIONS = "274878221376";

/** Plain "add bot to server" link — no redirect_uri or client secret needed. Guild linking
 *  itself happens through the bot's own /connect command (see lib/integrations/discord-bot.ts),
 *  not this URL, so there's nothing here for Discord to call back to. */
export function buildDiscordInviteUrl(): string | null {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "bot applications.commands",
    permissions: BOT_PERMISSIONS,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
