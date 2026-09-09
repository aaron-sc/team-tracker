import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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

  const backLink = (
    <Link href={`/${orgSlug}/scrims`} className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ChevronLeft className="size-4" />
      Back to Scrim Finder
    </Link>
  );

  if (teams.length === 0) {
    return (
      <div>
        {backLink}
        <h1 className="mb-2 text-xl font-semibold">Post a scrim listing</h1>
        <p className="text-sm text-muted-foreground">
          You need a team before you can post a listing.{" "}
          <Link href={`/${orgSlug}/teams/new`} className="text-primary underline underline-offset-4">
            Create a team
          </Link>{" "}
          to get started.
        </p>
      </div>
    );
  }

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
      {backLink}
      <h1 className="mb-1 text-xl font-semibold">Post a scrim listing</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Visible to other organizations until it&apos;s matched or cancelled — you can cancel anytime from the Scrim Finder.
      </p>
      <ScrimListingForm action={action} teams={teamsWithRank} />
    </div>
  );
}
