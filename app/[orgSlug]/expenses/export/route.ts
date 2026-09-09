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
  if (!membership.permissions.includes(Permission.expense_manage)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expenses = await prisma.expense.findMany({
    where: { orgId: membership.orgId },
    include: { team: true, createdBy: { include: { user: true } } },
    orderBy: { incurredAt: "desc" },
  });

  const csv = toCsv(
    ["Date", "Category", "Description", "Amount", "Team", "Created by"],
    expenses.map((e) => [
      e.incurredAt.toISOString().slice(0, 10),
      e.category,
      e.description,
      (e.amountCents / 100).toFixed(2),
      e.team?.name ?? "",
      e.createdBy?.user.name ?? "",
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${orgSlug}-expenses.csv"`,
    },
  });
}
