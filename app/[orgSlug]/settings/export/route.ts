import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";

export async function GET(_req: Request, { params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = session.memberships.find((m) => m.orgSlug === orgSlug);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!membership.permissions.includes(Permission.org_settings_manage)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = membership.orgId;

  const [org, teams, members, roster, matches, sessions, venues, prospects, announcements] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId } }),
    prisma.team.findMany({ where: { orgId } }),
    prisma.membership.findMany({
      where: { orgId },
      include: { user: { select: { id: true, name: true, email: true, phone: true, discordHandle: true } }, role: true },
    }),
    prisma.teamMembership.findMany({ where: { team: { orgId } } }),
    prisma.match.findMany({ where: { team: { orgId } }, include: { opponent: true, venue: true } }),
    prisma.practiceSession.findMany({ where: { team: { orgId } }, include: { opponent: true, venue: true } }),
    prisma.venue.findMany({ where: { orgId } }),
    prisma.recruitmentProspect.findMany({ where: { orgId } }),
    prisma.announcement.findMany({ where: { orgId } }),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    org,
    teams,
    members: members.map((m) => ({
      id: m.id,
      role: m.role.name,
      joinedAt: m.joinedAt,
      user: m.user,
    })),
    roster,
    matches,
    practiceSessions: sessions,
    venues,
    recruitmentProspects: prospects,
    announcements,
  };

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${orgSlug}-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
