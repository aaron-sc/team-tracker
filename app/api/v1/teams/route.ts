import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticateApiRequest } from "@/lib/api/auth";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof NextResponse) return auth;

  const teams = await prisma.team.findMany({
    where: { orgId: auth.orgId },
    select: {
      id: true,
      name: true,
      game: true,
      slug: true,
      _count: { select: { teamMemberships: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      game: t.game,
      slug: t.slug,
      rosterSize: t._count.teamMemberships,
    })),
  });
}
