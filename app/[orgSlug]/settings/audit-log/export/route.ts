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
  if (!membership.permissions.includes(Permission.audit_log_view)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const entries = await prisma.auditLog.findMany({
    where: { orgId: membership.orgId },
    include: { actorMembership: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    ["When", "Actor", "Action", "Target type", "Target ID", "IP address", "User agent", "Details"],
    entries.map((e) => [
      e.createdAt.toISOString(),
      e.actorMembership?.user.name ?? "System",
      e.action,
      e.targetType,
      e.targetId,
      e.ipAddress ?? "",
      e.userAgent ?? "",
      e.metadata ? JSON.stringify(e.metadata) : "",
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${orgSlug}-audit-log.csv"`,
    },
  });
}
