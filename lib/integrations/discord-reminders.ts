import "server-only";
import { prisma } from "@/lib/db/prisma";
import { notifyDiscord, FORMATION_EMBED_COLOR, roleMentionPrefix } from "@/lib/integrations/discord";
import { formatDateTime } from "@/lib/utils/format-time";
import { getBackgroundBaseUrl } from "@/lib/utils/base-url";

const POLL_INTERVAL_MS = 60_000;
// Don't fire a reminder for an event whose start time has already passed by more than this —
// avoids a burst of stale "in N minutes!" pings after the server was down for a while.
const MAX_STALE_MINUTES = 10;

let started = false;

export function startDiscordReminderScheduler() {
  if (started) return;
  started = true;
  runSweep();
  setInterval(runSweep, POLL_INTERVAL_MS);
}

async function runSweep() {
  try {
    await Promise.all([sweepMatches(), sweepPracticeSessions()]);
  } catch (err) {
    console.error("[discord-reminders] sweep failed:", err);
  }
}

async function sweepMatches() {
  const now = new Date();
  const baseUrl = getBackgroundBaseUrl();
  const matches = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      reminderSentAt: null,
      scheduledAt: { gte: new Date(now.getTime() - MAX_STALE_MINUTES * 60_000) },
      team: { discordWebhookUrl: { not: null }, discordMatchReminderMinutes: { not: null } },
    },
    include: { team: { include: { org: true } }, opponent: true, venue: true },
  });

  for (const match of matches) {
    const leadMinutes = match.team.discordMatchReminderMinutes;
    if (leadMinutes == null) continue;
    const minutesUntil = (match.scheduledAt.getTime() - now.getTime()) / 60_000;
    if (minutesUntil > leadMinutes) continue;

    await prisma.match.update({ where: { id: match.id }, data: { reminderSentAt: now } });

    const location =
      match.locationType === "LAN" ? (match.venue?.name ?? "Venue TBD") : match.isStreamed ? "Online (streamed)" : "Online";
    const eventUrl = baseUrl ? `${baseUrl}/${match.team.org.slug}/schedule/matches/${match.id}` : undefined;

    await notifyDiscord(match.team.discordWebhookUrl, {
      content: `${roleMentionPrefix(match.team.discordMentionRoleId)}**${match.team.name}** — Match vs ${match.opponent.name} in ${leadMinutes} minute${leadMinutes === 1 ? "" : "s"}!`,
      embeds: [
        {
          title: `${match.team.name} vs ${match.opponent.name}`,
          url: eventUrl,
          color: FORMATION_EMBED_COLOR,
          fields: [
            { name: "When", value: formatDateTime(match.scheduledAt, match.timezone), inline: true },
            { name: "Format", value: match.format, inline: true },
            { name: "Location", value: location, inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }
}

async function sweepPracticeSessions() {
  const now = new Date();
  const baseUrl = getBackgroundBaseUrl();
  const sessions = await prisma.practiceSession.findMany({
    where: {
      reminderSentAt: null,
      scheduledAt: { gte: new Date(now.getTime() - MAX_STALE_MINUTES * 60_000) },
      team: { discordWebhookUrl: { not: null } },
    },
    include: { team: { include: { org: true } }, opponent: true, venue: true },
  });

  for (const session of sessions) {
    const leadMinutes =
      session.type === "SCRIM" ? session.team.discordScrimReminderMinutes : session.team.discordPracticeReminderMinutes;
    if (leadMinutes == null) continue;
    const minutesUntil = (session.scheduledAt.getTime() - now.getTime()) / 60_000;
    if (minutesUntil > leadMinutes) continue;

    await prisma.practiceSession.update({ where: { id: session.id }, data: { reminderSentAt: now } });

    const label = session.type === "SCRIM" ? `Scrim vs ${session.opponent?.name ?? "TBD"}` : "Practice";
    const location = session.locationType === "LAN" ? (session.venue?.name ?? "Venue TBD") : "Online";
    const eventUrl = baseUrl ? `${baseUrl}/${session.team.org.slug}/schedule/practice/${session.id}` : undefined;

    await notifyDiscord(session.team.discordWebhookUrl, {
      content: `${roleMentionPrefix(session.team.discordMentionRoleId)}**${session.team.name}** — ${label} in ${leadMinutes} minute${leadMinutes === 1 ? "" : "s"}!`,
      embeds: [
        {
          title: `${session.team.name} — ${label}`,
          url: eventUrl,
          color: FORMATION_EMBED_COLOR,
          fields: [
            { name: "When", value: formatDateTime(session.scheduledAt, session.timezone), inline: true },
            { name: "Location", value: location, inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }
}
