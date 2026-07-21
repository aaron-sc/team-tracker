import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticateApiRequest } from "@/lib/api/auth";

export async function GET(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { teamId } = await params;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.orgId !== auth.orgId) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }

  const roster = await prisma.teamMembership.findMany({
    where: { teamId },
    include: { membership: { include: { user: true, role: true } } },
    orderBy: { joinedTeamAt: "asc" },
  });

  return NextResponse.json({
    team: { id: team.id, name: team.name, game: team.game, slug: team.slug },
    roster: roster.map((entry) => ({
      membershipId: entry.membershipId,
      name: entry.membership.user.name,
      inGameName: entry.inGameName,
      position: entry.position,
      jerseyNumber: entry.jerseyNumber,
      isStarter: entry.isStarter,
      role: entry.membership.role.name,
    })),
  });
}
