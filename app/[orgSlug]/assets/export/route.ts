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
  if (!membership.permissions.includes(Permission.asset_manage)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assets = await prisma.asset.findMany({
    where: { orgId: membership.orgId },
    include: { team: true, uploadedBy: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    ["Title", "Category", "Team", "File", "Size (bytes)", "Uploaded by", "Uploaded at", "Notes"],
    assets.map((a) => [
      a.title,
      a.category,
      a.team?.name ?? "",
      a.fileName,
      a.fileSize,
      a.uploadedBy?.user.name ?? "",
      a.createdAt.toISOString(),
      a.notes ?? "",
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${orgSlug}-assets.csv"`,
    },
  });
}
