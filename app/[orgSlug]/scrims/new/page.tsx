import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { ScrimListingForm } from "@/components/scrims/scrim-listing-form";
import { createScrimListingAction } from "@/lib/actions/scrims";
import { averageRank } from "@/lib/constants/ranks";

export default async function NewScrimListingPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership, teams } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.scrim_manage);

  const rosters = await prisma.teamMembership.findMany({
    where: { teamId: { in: teams.map((t) => t.id) } },
    select: { teamId: true, rank: true },
  });

  const teamsWithRank = teams.map((t) => ({
    ...t,
    averageRank: averageRank(
      t.game,
      rosters.filter((r) => r.teamId === t.id).map((r) => r.rank),
    ),
  }));

  const action = createScrimListingAction.bind(null, orgSlug, org.id);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Post a scrim listing</h1>
      <ScrimListingForm action={action} teams={teamsWithRank} />
    </div>
  );
}
