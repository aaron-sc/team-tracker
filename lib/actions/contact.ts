"use server";

import { redirect } from "next/navigation";
import { sendDiscordWebhook, FORMATION_EMBED_COLOR } from "@/lib/integrations/discord";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import type { ActionState } from "@/lib/actions/types";

const MAX_MESSAGE_LENGTH = 4000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Public, unauthenticated contact form — posts to the same operator Discord webhook as feature
 *  requests (FEEDBACK_DISCORD_WEBHOOK_URL), tagged separately so the two are easy to tell apart. */
export async function submitContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Honeypot: a real visitor never sees or fills this field (hidden off-screen); a bot filling
  // every input in the form will. Redirect to the same thank-you page rather than erroring, so
  // bots don't learn to leave it blank next time.
  if (String(formData.get("company") ?? "").trim()) {
    redirect("/contact/thank-you");
  }

  const allowed = await checkRateLimit("contact_form", 5, 60 * 60 * 1000);
  if (!allowed) return { error: "Too many submissions from this network — try again later." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !message) return { error: "Fill in every field." };
  if (!EMAIL_PATTERN.test(email)) return { error: "Enter a valid email address." };
  if (message.length > MAX_MESSAGE_LENGTH) return { error: `Keep it under ${MAX_MESSAGE_LENGTH} characters.` };

  const webhookUrl = process.env.FEEDBACK_DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    await sendDiscordWebhook(webhookUrl, {
      embeds: [
        {
          title: "New contact form submission",
          description: message,
          color: FORMATION_EMBED_COLOR,
          fields: [
            { name: "From", value: name, inline: true },
            { name: "Email", value: email, inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    }).catch((err) => console.error("[contact] webhook post failed:", err));
  }

  redirect("/contact/thank-you");
}
