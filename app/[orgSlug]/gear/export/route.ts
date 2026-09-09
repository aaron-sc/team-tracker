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
  if (!membership.permissions.includes(Permission.gear_manage)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await prisma.gearItem.findMany({
    where: { orgId: membership.orgId },
    include: { assignedToMembership: { include: { user: true } }, assignedToTeam: true },
    orderBy: { name: "asc" },
  });

  const csv = toCsv(
    ["Name", "Category", "Serial", "Status", "Assigned to", "Notes"],
    items.map((g) => [
      g.name,
      g.category ?? "",
      g.serialNumber ?? "",
      g.status,
      g.assignedToMembership?.user.name ?? g.assignedToTeam?.name ?? "",
      g.notes ?? "",
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${orgSlug}-gear.csv"`,
    },
  });
}
