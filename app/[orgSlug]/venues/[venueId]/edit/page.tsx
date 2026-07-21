import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { VenueForm } from "@/components/venues/venue-form";
import { updateVenueAction } from "@/lib/actions/venues";

export default async function EditVenuePage({
  params,
}: {
  params: Promise<{ orgSlug: string; venueId: string }>;
}) {
  const { orgSlug, venueId } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.venue_edit);

  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue || venue.orgId !== org.id) notFound();

  const action = updateVenueAction.bind(null, orgSlug, org.id, venue.id);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Edit venue</h1>
      <VenueForm
        action={action}
        defaultTimezone={org.timezone}
        defaultValues={{
          name: venue.name,
          addressLine1: venue.addressLine1,
          addressLine2: venue.addressLine2 ?? "",
          city: venue.city,
          state: venue.state ?? "",
          postalCode: venue.postalCode ?? "",
          country: venue.country,
          capacity: venue.capacity,
          contactName: venue.contactName ?? "",
          contactPhone: venue.contactPhone ?? "",
          contactEmail: venue.contactEmail ?? "",
          notes: venue.notes ?? "",
          timezone: venue.timezone,
        }}
      />
    </div>
  );
}
