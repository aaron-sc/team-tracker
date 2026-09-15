import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canSeeTeam } from "@/lib/auth/authorize";
import { prisma } from "@/lib/db/prisma";
import { computeTeamAvailabilityOverlap, topOverlapSlots } from "@/lib/availability/overlap";

/** Anyone on this specific team, or anyone holding teams_view_all, can fetch this — it powers the
 *  "suggested times" panel on the match/practice scheduling forms and is not sensitive beyond
 *  what the team availability page already shows to the same audience. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { orgId: true } });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = session.memberships.find((m) => m.orgId === team.orgId);
  if (!membership || !canSeeTeam(membership, teamId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: team.orgId }, select: { timezone: true } });
  const grid = await computeTeamAvailabilityOverlap(teamId, org.timezone);
  const topSlots = topOverlapSlots(grid, 6, 2);

  return NextResponse.json({ rosterSize: grid.rosterSize, topSlots });
}
