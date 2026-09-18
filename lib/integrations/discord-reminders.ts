import "server-only";
import { prisma } from "@/lib/db/prisma";
import { notifyDiscord, FORMATION_EMBED_COLOR, roleMentionPrefix } from "@/lib/integrations/discord";
import { formatDateTime } from "@/lib/utils/format-time";
import { getBackgroundBaseUrl } from "@/lib/utils/base-url";
import { sweepScheduledAnnouncements } from "@/lib/scheduler/scheduled-announcements";
import { sendPushToUser } from "@/lib/notifications/push";
import { postInteractiveReminder, dmReminderToRoster } from "@/lib/integrations/discord-bot";
import { parseReminderMinutesList } from "@/lib/utils/reminder-options";
import { sessionTypeLabel } from "@/lib/utils/session-label";

/** Pushes a reminder to every roster member's opted-in devices — independent of whether the team
 *  also has a Discord webhook configured, so push works for teams that never set that up. */
async function pushReminderToRoster(teamId: string, title: string, body: string, linkUrl: string | undefined) {
  const roster = await prisma.teamMembership.findMany({
    where: { teamId },
    select: { membership: { select: { userId: true } } },
  });
  await Promise.all(roster.map((r) => sendPushToUser(r.membership.userId, { title, body, linkUrl }).catch(() => {})));
}

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
    await Promise.all([sweepMatches(), sweepPracticeSessions(), sweepScheduledAnnouncements()]);
  } catch (err) {
    console.error("[discord-reminders] sweep failed:", err);
  }
}

function formatLeadTime(minutes: number): string {
  return minutes >= 1440 && minutes % 1440 === 0
    ? `${minutes / 1440} day${minutes === 1440 ? "" : "s"}`
    : minutes >= 60 && minutes % 60 === 0
      ? `${minutes / 60} hour${minutes === 60 ? "" : "s"}`
      : `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

async function sweepMatches() {
  const now = new Date();
  const baseUrl = getBackgroundBaseUrl();
  const matches = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { gte: new Date(now.getTime() - MAX_STALE_MINUTES * 60_000) },
    },
    include: { team: { include: { org: true } }, opponent: true, venue: true },
  });

  for (const match of matches) {
    const configured = parseReminderMinutesList(match.team.discordMatchReminderMinutes);
    if (configured.length === 0) continue;
    const alreadySent = parseReminderMinutesList(match.sentReminderMinutes);
    const minutesUntil = (match.scheduledAt.getTime() - now.getTime()) / 60_000;
    const due = configured.filter((m) => minutesUntil <= m && !alreadySent.includes(m));
    if (due.length === 0) continue;

    await prisma.match.update({
      where: { id: match.id },
      data: { sentReminderMinutes: [...alreadySent, ...due].sort((a, b) => a - b) },
    });

    const location =
      match.locationType === "LAN" ? (match.venue?.name ?? "Venue TBD") : match.isStreamed ? "Online (streamed)" : "Online";
    const eventUrl = baseUrl ? `${baseUrl}/${match.team.org.slug}/schedule/matches/${match.id}` : undefined;

    for (const leadMinutes of due) {
      const lead = formatLeadTime(leadMinutes);
      await notifyDiscord(match.team.discordWebhookUrl, {
        content: `${roleMentionPrefix(match.team.discordMentionRoleId)}**${match.team.name}** — Match vs ${match.opponent.name} in ${lead}!`,
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

      const title = `${match.team.name} — Match in ${lead}!`;
      const body = `vs ${match.opponent.name} · ${location}`;

      await pushReminderToRoster(match.teamId, title, body, eventUrl);
      await dmReminderToRoster(match.teamId, title, body, eventUrl).catch(() => {});
      if (match.team.discordReminderChannelId) {
        await postInteractiveReminder(match.team.discordReminderChannelId, "MATCH", match.id, title, body).catch(() => {});
      }
    }
  }
}

async function sweepPracticeSessions() {
  const now = new Date();
  const baseUrl = getBackgroundBaseUrl();
  const sessions = await prisma.practiceSession.findMany({
    where: {
      scheduledAt: { gte: new Date(now.getTime() - MAX_STALE_MINUTES * 60_000) },
    },
    include: { team: { include: { org: true } }, opponent: true, venue: true, eventType: true },
  });

  for (const session of sessions) {
    const configured = parseReminderMinutesList(
      session.type === "SCRIM" ? session.team.discordScrimReminderMinutes : session.team.discordPracticeReminderMinutes,
    );
    if (configured.length === 0) continue;
    const alreadySent = parseReminderMinutesList(session.sentReminderMinutes);
    const minutesUntil = (session.scheduledAt.getTime() - now.getTime()) / 60_000;
    const due = configured.filter((m) => minutesUntil <= m && !alreadySent.includes(m));
    if (due.length === 0) continue;

    await prisma.practiceSession.update({
      where: { id: session.id },
      data: { sentReminderMinutes: [...alreadySent, ...due].sort((a, b) => a - b) },
    });

    const trackAttendance = session.type !== "EVENT" || (session.eventType?.trackAttendance ?? true);
    const label = sessionTypeLabel(session);
    const location = session.locationType === "LAN" ? (session.venue?.name ?? "Venue TBD") : "Online";
    const eventUrl = baseUrl ? `${baseUrl}/${session.team.org.slug}/schedule/practice/${session.id}` : undefined;

    for (const leadMinutes of due) {
      const lead = formatLeadTime(leadMinutes);
      await notifyDiscord(session.team.discordWebhookUrl, {
        content: `${roleMentionPrefix(session.team.discordMentionRoleId)}**${session.team.name}** — ${label} in ${lead}!`,
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

      const title = `${session.team.name} — ${label} in ${lead}!`;

      await pushReminderToRoster(session.teamId, title, location, eventUrl);
      await dmReminderToRoster(session.teamId, title, location, eventUrl).catch(() => {});
      if (session.team.discordReminderChannelId && trackAttendance) {
        await postInteractiveReminder(session.team.discordReminderChannelId, "PRACTICE", session.id, title, location).catch(() => {});
      }
    }
  }
}
