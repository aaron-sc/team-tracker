import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { buildIcsCalendar, type IcsEvent } from "@/lib/calendar/ics";

export async function GET(_req: Request, { params }: { params: Promise<{ orgSlug: string; sessionId: string }> }) {
  const { orgSlug, sessionId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = session.memberships.find((m) => m.orgSlug === orgSlug);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const practiceSession = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
    include: { team: true, opponent: true, venue: true },
  });
  if (!practiceSession || practiceSession.team.orgId !== membership.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const title = `${practiceSession.team.name} ${
    practiceSession.type === "SCRIM" ? `scrim vs ${practiceSession.opponent?.name ?? "TBD"}` : "practice"
  }`;

  const event: IcsEvent = {
    uid: `session-${practiceSession.id}@formation`,
    title,
    description: practiceSession.notes ?? undefined,
    location: practiceSession.venue
      ? practiceSession.venue.isOnline
        ? (practiceSession.venue.onlineUrl ?? practiceSession.venue.name)
        : `${practiceSession.venue.name}, ${practiceSession.venue.city}`
      : undefined,
    start: practiceSession.scheduledAt,
    end: new Date(practiceSession.scheduledAt.getTime() + practiceSession.durationMinutes * 60 * 1000),
  };

  const ics = buildIcsCalendar([event], title);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="session-${practiceSession.id}.ics"`,
    },
  });
}
