"use server";

import { requireSession } from "@/lib/auth/authorize";
import { sendDiscordWebhook, FORMATION_EMBED_COLOR } from "@/lib/integrations/discord";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import type { ActionState } from "@/lib/actions/types";

const MIN_LENGTH = 5;
const MAX_LENGTH = 2000;

/** Sends a feature request to the operator's own Discord (FEEDBACK_DISCORD_WEBHOOK_URL) — a
 *  fixed destination configured once for the whole deployment, unrelated to any org's own
 *  Discord integration settings. */
export async function submitFeatureRequestAction(orgName: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();

  const allowed = await checkRateLimit("feature_request", 5, 60 * 60 * 1000);
  if (!allowed) return { error: "You've sent a few of these already — try again in a bit." };

  const message = String(formData.get("message") ?? "").trim();
  if (message.length < MIN_LENGTH) return { error: "Give us a bit more detail." };
  if (message.length > MAX_LENGTH) return { error: `Keep it under ${MAX_LENGTH} characters.` };

  const webhookUrl = process.env.FEEDBACK_DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("[feedback] FEEDBACK_DISCORD_WEBHOOK_URL not configured.");
    return { error: "Feature requests aren't set up for this deployment yet." };
  }

  const result = await sendDiscordWebhook(webhookUrl, {
    embeds: [
      {
        title: "New feature request",
        description: message,
        color: FORMATION_EMBED_COLOR,
        fields: [
          { name: "From", value: session.user.name ?? session.user.email ?? "Unknown", inline: true },
          { name: "Org", value: orgName, inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });

  if (!result.ok) {
    console.error("[feedback] webhook post failed:", result.error);
    return { error: "Couldn't send that — try again in a moment." };
  }
  return { success: "Thanks! Your feature request is on its way." };
}
