import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildIcsCalendar, type IcsEvent } from "@/lib/calendar/ics";

const DEFAULT_MATCH_MINUTES = 90;

export async function GET(req: NextRequest, { params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const key = req.nextUrl.searchParams.get("key");

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!org.apiKey || key !== org.apiKey) {
    return NextResponse.json(
      { error: "Missing or invalid key. Generate an API key in Settings → Integrations, then use that as ?key=." },
      { status: 401 },
    );
  }

  const [matches, sessions] = await Promise.all([
    prisma.match.findMany({
      where: { team: { orgId: org.id } },
      include: { team: true, opponent: true, venue: true },
    }),
    prisma.practiceSession.findMany({
      where: { team: { orgId: org.id } },
      include: { team: true, opponent: true, venue: true },
    }),
  ]);

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
    })),
    ...sessions.map((s) => ({
      uid: `session-${s.id}@formation`,
      title: `${s.team.name} ${s.type === "SCRIM" ? `scrim vs ${s.opponent?.name ?? "TBD"}` : "practice"}`,
      description: s.notes ?? undefined,
      location: s.venue ? (s.venue.isOnline ? s.venue.onlineUrl ?? s.venue.name : `${s.venue.name}, ${s.venue.city}`) : undefined,
      start: s.scheduledAt,
      end: new Date(s.scheduledAt.getTime() + s.durationMinutes * 60 * 1000),
    })),
  ];

  const ics = buildIcsCalendar(events, `${org.name} Schedule`);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${orgSlug}-schedule.ics"`,
    },
  });
}
