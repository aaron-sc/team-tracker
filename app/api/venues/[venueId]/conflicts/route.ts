import { NextRequest, NextResponse } from "next/server";
import { fromZonedTime } from "date-fns-tz";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

// Matches have no durationMinutes field (only PracticeSession does) — for overlap-checking
// purposes only, treat a match as occupying a fixed ~2-hour block. This is an approximation
// used solely to power a non-blocking warning, never to gate scheduling.
const ASSUMED_MATCH_DURATION_MINUTES = 120;

/** Non-authoritative "is anything else already booked at this venue around this time" check —
 *  powers a warning in the match/practice scheduling forms, never blocks submission. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ venueId: string }> }) {
  const { venueId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { orgId: true, timezone: true, name: true } });
  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = session.memberships.find((m) => m.orgId === venue.orgId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const scheduledAtRaw = req.nextUrl.searchParams.get("scheduledAt");
  if (!scheduledAtRaw) return NextResponse.json({ conflicts: [] });
  const durationMinutes = Number(req.nextUrl.searchParams.get("durationMinutes")) || 60;
  const excludeMatchId = req.nextUrl.searchParams.get("excludeMatchId") ?? undefined;
  const excludePracticeId = req.nextUrl.searchParams.get("excludePracticeId") ?? undefined;

  let newStart: Date;
  try {
    newStart = fromZonedTime(scheduledAtRaw, venue.timezone);
  } catch {
    return NextResponse.json({ conflicts: [] });
  }
  const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000);

  const [matches, sessions] = await Promise.all([
    prisma.match.findMany({
      where: { venueId, id: excludeMatchId ? { not: excludeMatchId } : undefined, status: { not: "CANCELLED" } },
      include: { team: true },
    }),
    prisma.practiceSession.findMany({
      where: { venueId, id: excludePracticeId ? { not: excludePracticeId } : undefined },
      include: { team: true },
    }),
  ]);

  const conflicts = [
    ...matches
      .filter((m) => m.scheduledAt < newEnd && newStart < new Date(m.scheduledAt.getTime() + ASSUMED_MATCH_DURATION_MINUTES * 60 * 1000))
      .map((m) => ({ label: `${m.team.name}'s match`, scheduledAt: m.scheduledAt.toISOString() })),
    ...sessions
      .filter((s) => s.scheduledAt < newEnd && newStart < new Date(s.scheduledAt.getTime() + s.durationMinutes * 60 * 1000))
      .map((s) => ({
        label: `${s.team.name}'s ${s.type === "SCRIM" ? "scrim" : "practice"}`,
        scheduledAt: s.scheduledAt.toISOString(),
      })),
  ];

  return NextResponse.json({ venueName: venue.name, venueTimezone: venue.timezone, conflicts });
}
