import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { VenueForm } from "@/components/venues/venue-form";
import { createVenueAction } from "@/lib/actions/venues";

export default async function NewVenuePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.venue_create);

  const action = createVenueAction.bind(null, orgSlug, org.id);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">New venue</h1>
      <VenueForm action={action} defaultTimezone={org.timezone} />
    </div>
  );
}
