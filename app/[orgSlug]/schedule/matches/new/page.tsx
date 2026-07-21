import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { MatchForm } from "@/components/schedule/match-form";
import { createMatchAction } from "@/lib/actions/matches";

export default async function NewMatchPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership, teams } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.match_create);

  const [opponents, venues] = await Promise.all([
    prisma.opponent.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
    prisma.venue.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
  ]);

  const action = createMatchAction.bind(null, orgSlug, org.id);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Schedule a match</h1>
      <MatchForm action={action} teams={teams} opponents={opponents} venues={venues} />
    </div>
  );
}
