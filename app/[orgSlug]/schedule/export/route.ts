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

  const [matches, sessions] = await Promise.all([
    prisma.match.findMany({
      where: { team: { orgId: membership.orgId } },
      include: { team: true, opponent: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.practiceSession.findMany({
      where: { team: { orgId: membership.orgId } },
      include: { team: true, opponent: true },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  const rows = [
    ...matches.map((m) => [
      "Match",
      m.team.name,
      m.opponent.name,
      m.format,
      m.scheduledAt.toISOString(),
      m.resultStatus ?? "",
      m.scoreFor != null && m.scoreAgainst != null ? `${m.scoreFor}-${m.scoreAgainst}` : "",
    ]),
    ...sessions.map((s) => [
      s.type === "SCRIM" ? "Scrim" : "Practice",
      s.team.name,
      s.opponent?.name ?? "",
      `${s.durationMinutes}min`,
      s.scheduledAt.toISOString(),
      "",
      "",
    ]),
  ].sort((a, b) => a[4].localeCompare(b[4]));

  const csv = toCsv(["Type", "Team", "Opponent", "Format/Duration", "Scheduled at", "Result", "Score"], rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${orgSlug}-schedule.csv"`,
    },
  });
}
