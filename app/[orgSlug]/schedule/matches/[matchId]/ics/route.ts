import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { buildIcsCalendar, type IcsEvent } from "@/lib/calendar/ics";

const DEFAULT_MATCH_MINUTES = 90;

export async function GET(_req: Request, { params }: { params: Promise<{ orgSlug: string; matchId: string }> }) {
  const { orgSlug, matchId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = session.memberships.find((m) => m.orgSlug === orgSlug);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { team: true, opponent: true, venue: true },
  });
  if (!match || match.team.orgId !== membership.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const event: IcsEvent = {
    uid: `match-${match.id}@formation`,
    title: `${match.team.name} vs ${match.opponent.name}`,
    description: [match.format, match.isStreamed && match.streamUrl ? `Stream: ${match.streamUrl}` : null, match.notes]
      .filter(Boolean)
      .join("\n"),
    location: match.venue
      ? match.venue.isOnline
        ? (match.venue.onlineUrl ?? match.venue.name)
        : `${match.venue.name}, ${match.venue.city}`
      : undefined,
    start: match.scheduledAt,
    end: new Date(match.scheduledAt.getTime() + DEFAULT_MATCH_MINUTES * 60 * 1000),
  };

  const ics = buildIcsCalendar([event], `${match.team.name} vs ${match.opponent.name}`);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="match-${match.id}.ics"`,
    },
  });
}
