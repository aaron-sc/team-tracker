import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyInternalApiSecret } from "@/lib/auth/internal-api";
import { checkRateLimit } from "@/lib/utils/rate-limit";

const PAGE_SIZE = 25;

/**
 * Server-to-server only — the full (searchable, paginated) org list behind the admin console's
 * /admin/orgs. Same bearer-secret guard as the other internal routes.
 */
export async function GET(request: NextRequest) {
  if (!verifyInternalApiSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit("internal_admin_stats", 60, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  const cursor = request.nextUrl.searchParams.get("cursor");

  const orgs = await prisma.organization.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { slug: { contains: q } }] } : undefined,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      _count: { select: { memberships: true } },
    },
  });

  const nextCursor = orgs.length > PAGE_SIZE ? orgs[PAGE_SIZE].id : null;

  return NextResponse.json({
    orgs: orgs.slice(0, PAGE_SIZE).map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      createdAt: o.createdAt,
      memberCount: o._count.memberships,
    })),
    nextCursor,
  });
}
