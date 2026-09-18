import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { toCsv } from "@/lib/csv";
import { canSeeTeam } from "@/lib/auth/authorize";
import { Permission } from "@/lib/generated/prisma/enums";

export async function GET(_req: Request, { params }: { params: Promise<{ orgSlug: string; teamSlug: string }> }) {
  const { orgSlug, teamSlug } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = session.memberships.find((m) => m.orgSlug === orgSlug);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const team = await prisma.team.findUnique({ where: { orgId_slug: { orgId: membership.orgId, slug: teamSlug } } });
  if (!team || !canSeeTeam(membership, team.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canViewContactInfo = membership.permissions.includes(Permission.org_members_contact_view);

  const roster = await prisma.teamMembership.findMany({
    where: { teamId: team.id },
    include: { membership: { include: { user: true, role: true } } },
    orderBy: { joinedTeamAt: "asc" },
  });

  const csv = toCsv(
    ["Name", "Email", "Role", "Position", "In-game name", "Jersey #", "Rank", "Starter", "Joined team"],
    roster.map((r) => [
      r.membership.user.name,
      canViewContactInfo ? r.membership.user.email : "",
      r.membership.role.name,
      r.position ?? "",
      r.inGameName ?? "",
      r.jerseyNumber ?? "",
      r.rank ?? "",
      r.isStarter ? "Yes" : "No",
      r.joinedTeamAt.toISOString().slice(0, 10),
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${orgSlug}-${teamSlug}-roster.csv"`,
    },
  });
}
