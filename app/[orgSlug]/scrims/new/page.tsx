import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { ScrimListingForm } from "@/components/scrims/scrim-listing-form";
import { createScrimListingAction } from "@/lib/actions/scrims";

export default async function NewScrimListingPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership, teams } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.scrim_manage);

  const action = createScrimListingAction.bind(null, orgSlug, org.id);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Post a scrim listing</h1>
      <ScrimListingForm action={action} teams={teams} />
    </div>
  );
}
