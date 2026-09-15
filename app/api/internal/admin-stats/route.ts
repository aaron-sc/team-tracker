import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyInternalApiSecret } from "@/lib/auth/internal-api";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { bucketByWeek } from "@/lib/utils/bucket-by-week";

/**
 * Server-to-server only — read-only counts and recent activity for the admin console at
 * admin.esports-tools.com (see esports-hub's lib/admin/stats.ts). Same bearer-secret guard as the
 * credential-check routes; there's nothing here more sensitive than what's already visible to any
 * org owner within their own org, just aggregated across all of them.
 */
export async function GET(request: NextRequest) {
  if (!verifyInternalApiSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit("internal_admin_stats", 60, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000);

  const [organizations, users, teams, recentSignups, recentLogins, recentUserDates] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.team.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { name: true, email: true, createdAt: true },
    }),
    prisma.loginEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { createdAt: true, user: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: twelveWeeksAgo } },
      select: { createdAt: true },
    }),
  ]);

  return NextResponse.json({
    counts: { organizations, users, teams },
    recentSignups,
    recentLogins: recentLogins.map((event) => ({ name: event.user.name, createdAt: event.createdAt })),
    signupsByWeek: bucketByWeek(recentUserDates.map((u) => u.createdAt), 12),
  });
}
