import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { SessionMembership } from "@/lib/auth/types";
import type { Session } from "next-auth";

export type OrgContext = {
  session: Session;
  membership: SessionMembership;
  org: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    logoUrl: string | null;
    themeColor: string;
    apiKey: string | null;
  };
  teams: { id: string; name: string; game: string; slug: string }[];
};

/**
 * Resolves and authorizes the current user's access to `orgSlug`, redirecting
 * to /login or /orgs when unauthenticated/unauthorized. Wrapped in React
 * `cache()` so layout + every page under [orgSlug] share one lookup per request.
 */
export const getOrgContext = cache(async (orgSlug: string): Promise<OrgContext> => {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = session.memberships.find((m) => m.orgSlug === orgSlug);
  if (!membership) redirect("/orgs");

  const [org, teams] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: membership.orgId },
      select: { id: true, name: true, slug: true, timezone: true, logoUrl: true, themeColor: true, apiKey: true },
    }),
    prisma.team.findMany({
      where: { orgId: membership.orgId },
      select: { id: true, name: true, game: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!org) redirect("/orgs");

  return { session, membership, org, teams };
});
