import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteVenueButton } from "@/components/venues/delete-venue-button";
import { Plus, MapPin, Users, Pencil } from "lucide-react";

export default async function VenuesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);

  const venues = await prisma.venue.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } });

  const canCreate = membership.permissions.includes(Permission.venue_create);
  const canEdit = membership.permissions.includes(Permission.venue_edit);
  const canDelete = membership.permissions.includes(Permission.venue_delete);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {venues.length} venue{venues.length === 1 ? "" : "s"}
        </p>
        {canCreate ? (
          <Button size="sm" asChild>
            <Link href={`/${orgSlug}/venues/new`}>
              <Plus className="size-4" />
              New venue
            </Link>
          </Button>
        ) : null}
      </div>

      {venues.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">No venues yet.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <Card key={venue.id}>
              <CardHeader>
                <CardTitle className="text-base">{venue.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-1.5 text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {venue.addressLine1}
                    {venue.addressLine2 ? `, ${venue.addressLine2}` : ""}, {venue.city}
                    {venue.state ? `, ${venue.state}` : ""} {venue.postalCode ?? ""}
                  </span>
                </div>
                {venue.capacity ? (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-4" />
                    Capacity {venue.capacity}
                  </div>
                ) : null}
                {venue.contactName || venue.contactPhone || venue.contactEmail ? (
                  <div className="text-muted-foreground">
                    {[venue.contactName, venue.contactPhone, venue.contactEmail].filter(Boolean).join(" · ")}
                  </div>
                ) : null}
                {(canEdit || canDelete) && (
                  <div className="flex gap-2 pt-2">
                    {canEdit ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/${orgSlug}/venues/${venue.id}/edit`}>
                          <Pencil className="size-4" />
                          Edit
                        </Link>
                      </Button>
                    ) : null}
                    {canDelete ? <DeleteVenueButton orgSlug={orgSlug} orgId={org.id} venueId={venue.id} /> : null}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
