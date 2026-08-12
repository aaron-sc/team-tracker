import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { toCsv } from "@/lib/csv";
import { Permission } from "@/lib/generated/prisma/enums";

export async function GET(_req: Request, { params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = session.memberships.find((m) => m.orgSlug === orgSlug);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!membership.permissions.includes(Permission.recruitment_view)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const prospects = await prisma.recruitmentProspect.findMany({
    where: { orgId: membership.orgId },
    include: { level: true, team: true },
    orderBy: { updatedAt: "desc" },
  });

  const csv = toCsv(
    ["Name", "Game", "Stage", "Level", "Team", "Email", "Phone", "Discord", "School/Org", "Updated"],
    prospects.map((p) => [
      p.name,
      p.game,
      p.stage,
      p.level?.name ?? "",
      p.team?.name ?? "",
      p.email ?? "",
      p.phone ?? "",
      p.discordHandle ?? "",
      p.schoolOrOrg ?? "",
      p.updatedAt.toISOString().slice(0, 10),
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${orgSlug}-prospects.csv"`,
    },
  });
}
