import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { toCsv } from "@/lib/csv";

export async function GET(_req: Request, { params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = session.memberships.find((m) => m.orgSlug === orgSlug);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const members = await prisma.membership.findMany({
    where: { orgId: membership.orgId },
    include: { user: true, role: true, teamMemberships: { include: { team: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const csv = toCsv(
    ["Name", "Email", "Role", "Teams", "Phone", "Discord", "Joined"],
    members.map((m) => [
      m.user.name,
      m.user.email,
      m.role.name,
      m.teamMemberships.map((tm) => tm.team.name).join("; "),
      m.user.phone ?? "",
      m.user.discordHandle ?? "",
      m.joinedAt.toISOString().slice(0, 10),
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${orgSlug}-roster.csv"`,
    },
  });
}
