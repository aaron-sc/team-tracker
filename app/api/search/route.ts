import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";

export type SearchResult = { type: string; id: string; label: string; sublabel?: string; href: string };

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("orgId");
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const membership = session.memberships.find((m) => m.orgId === orgId);
  if (!membership || !orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (q.length < 2) return NextResponse.json({ results: [] });

  const orgSlug = membership.orgSlug;
  const canViewRecruitment = membership.permissions.includes(Permission.recruitment_view);
  const canViewEmails = membership.permissions.includes(Permission.org_members_contact_view);
  const canViewScrims = membership.permissions.includes(Permission.scrim_manage);

  const [members, teams, venues, prospects, scrimListings, matches, sessions, announcements] = await Promise.all([
    prisma.membership.findMany({
      where: {
        orgId,
        user: canViewEmails ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : { name: { contains: q } },
      },
      include: { user: true },
      take: 6,
    }),
    prisma.team.findMany({
      where: { orgId, OR: [{ name: { contains: q } }, { game: { contains: q } }] },
      take: 6,
    }),
    prisma.venue.findMany({
      where: { orgId, OR: [{ name: { contains: q } }, { city: { contains: q } }, { onlineUrl: { contains: q } }] },
      take: 6,
    }),
    canViewRecruitment
      ? prisma.recruitmentProspect.findMany({ where: { orgId, name: { contains: q } }, take: 6 })
      : Promise.resolve([]),
    canViewScrims
      ? prisma.scrimListing.findMany({
          where: { orgId, OR: [{ game: { contains: q } }, { team: { name: { contains: q } } }] },
          include: { team: true },
          take: 6,
        })
      : Promise.resolve([]),
    prisma.match.findMany({
      where: { team: { orgId }, OR: [{ opponent: { name: { contains: q } } }, { team: { name: { contains: q } } }] },
      include: { team: true, opponent: true },
      orderBy: { scheduledAt: "desc" },
      take: 6,
    }),
    prisma.practiceSession.findMany({
      where: { team: { orgId }, OR: [{ opponent: { name: { contains: q } } }, { team: { name: { contains: q } } }] },
      include: { team: true, opponent: true },
      orderBy: { scheduledAt: "desc" },
      take: 6,
    }),
    prisma.announcement.findMany({
      where: { orgId, published: true, OR: [{ title: { contains: q } }, { body: { contains: q } }] },
      take: 6,
    }),
  ]);

  const results: SearchResult[] = [
    ...members.map((m) => ({
      type: "Member",
      id: m.id,
      label: m.user.name,
      sublabel: canViewEmails ? m.user.email : undefined,
      href: `/${orgSlug}/roster/${m.id}`,
    })),
    ...teams.map((t) => ({ type: "Team", id: t.id, label: t.name, sublabel: t.game, href: `/${orgSlug}/teams/${t.slug}` })),
    ...venues.map((v) => ({
      type: "Venue",
      id: v.id,
      label: v.name,
      sublabel: v.isOnline ? "Online" : (v.city ?? undefined),
      href: `/${orgSlug}/venues`,
    })),
    ...prospects.map((p) => ({
      type: "Prospect",
      id: p.id,
      label: p.name,
      sublabel: p.game,
      href: `/${orgSlug}/recruitment/${p.id}`,
    })),
    ...scrimListings.map((s) => ({
      type: "Scrim listing",
      id: s.id,
      label: `${s.team.name} (${s.game})`,
      sublabel: s.status,
      href: `/${orgSlug}/scrims`,
    })),
    ...matches.map((m) => ({
      type: "Match",
      id: m.id,
      label: `${m.team.name} vs ${m.opponent.name}`,
      sublabel: m.status,
      href: `/${orgSlug}/schedule/matches/${m.id}`,
    })),
    ...sessions.map((s) => ({
      type: "Practice",
      id: s.id,
      label: s.opponent ? `${s.team.name} vs ${s.opponent.name}` : `${s.team.name} practice`,
      sublabel: s.type,
      href: `/${orgSlug}/schedule/practice/${s.id}`,
    })),
    ...announcements.map((a) => ({
      type: "Announcement",
      id: a.id,
      label: a.title,
      href: `/${orgSlug}/announcements`,
    })),
  ];

  return NextResponse.json({ results });
}
