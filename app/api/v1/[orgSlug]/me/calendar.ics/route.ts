import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildIcsCalendar, type IcsEvent } from "@/lib/calendar/ics";

const DEFAULT_MATCH_MINUTES = 90;

/** A member's personal, unauthenticated calendar subscription feed — scoped to only the teams
 *  they're actually on, and gated by their own token (see Membership.calendarToken) rather than
 *  the org-wide API key, so any player can get a live link without needing admin-granted access. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json(
      { error: "Missing ?token=. Get your personal calendar link from Schedule → Subscribe." },
      { status: 401 },
    );
  }

  const membership = await prisma.membership.findUnique({
    where: { calendarToken: token },
    include: { org: true, user: true },
  });
  if (!membership || membership.org.slug !== orgSlug) {
    return NextResponse.json({ error: "Invalid or revoked calendar link." }, { status: 401 });
  }

  const teamLinks = await prisma.teamMembership.findMany({
    where: { membershipId: membership.id },
    select: { teamId: true },
  });
  const teamIds = teamLinks.map((t) => t.teamId);

  const [matches, sessions] = await Promise.all([
    prisma.match.findMany({
      where: { teamId: { in: teamIds } },
      include: { team: true, opponent: true, venue: true },
    }),
    prisma.practiceSession.findMany({
      where: { teamId: { in: teamIds } },
      include: { team: true, opponent: true, venue: true },
    }),
  ]);

  const base = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const events: IcsEvent[] = [
    ...matches.map((m) => ({
      uid: `match-${m.id}@formation`,
      title: `${m.team.name} vs ${m.opponent.name}`,
      description: [m.format, m.isStreamed && m.streamUrl ? `Stream: ${m.streamUrl}` : null, m.notes]
        .filter(Boolean)
        .join("\n"),
      location: m.venue ? (m.venue.isOnline ? m.venue.onlineUrl ?? m.venue.name : `${m.venue.name}, ${m.venue.city}`) : undefined,
      start: m.scheduledAt,
      end: new Date(m.scheduledAt.getTime() + DEFAULT_MATCH_MINUTES * 60 * 1000),
      url: `${base}/${orgSlug}/schedule/matches/${m.id}`,
    })),
    ...sessions.map((s) => ({
      uid: `session-${s.id}@formation`,
      title: `${s.team.name} ${s.type === "SCRIM" ? `scrim vs ${s.opponent?.name ?? "TBD"}` : "practice"}`,
      description: s.notes ?? undefined,
      location: s.venue ? (s.venue.isOnline ? s.venue.onlineUrl ?? s.venue.name : `${s.venue.name}, ${s.venue.city}`) : undefined,
      start: s.scheduledAt,
      end: new Date(s.scheduledAt.getTime() + s.durationMinutes * 60 * 1000),
      url: `${base}/${orgSlug}/schedule/practice/${s.id}`,
    })),
  ];

  const ics = buildIcsCalendar(events, `${membership.user.name} — ${membership.org.name}`);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${orgSlug}-my-schedule.ics"`,
    },
  });
}
