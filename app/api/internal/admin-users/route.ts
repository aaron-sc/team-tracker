import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyInternalApiSecret } from "@/lib/auth/internal-api";
import { checkRateLimit } from "@/lib/utils/rate-limit";

const PAGE_SIZE = 25;

/**
 * Server-to-server only — the full (searchable, paginated) user list behind the admin console's
 * /admin/users, as opposed to admin-stats' fixed "last 8" preview. Same bearer-secret guard as the
 * other internal routes.
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

  const users = await prisma.user.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : undefined,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, name: true, email: true, createdAt: true, emailVerifiedAt: true, totpEnabledAt: true },
  });

  const nextCursor = users.length > PAGE_SIZE ? users[PAGE_SIZE].id : null;

  return NextResponse.json({ users: users.slice(0, PAGE_SIZE), nextCursor });
}
