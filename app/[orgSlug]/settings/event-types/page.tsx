import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { EventTypeFormDialog } from "@/components/settings/event-type-form-dialog";
import { EventTypeRow } from "@/components/settings/event-type-row";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarDays } from "lucide-react";

export default async function EventTypesSettingsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.org_settings_manage);

  const eventTypes = await prisma.eventType.findMany({
    where: { orgId: org.id },
    include: { _count: { select: { sessions: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Event types</h1>
          <p className="text-sm text-muted-foreground">
            Custom kinds of team events — community events, season kickoffs, whatever you need — schedulable
            alongside practices and scrims. Each can opt out of attendance/RSVP tracking.
          </p>
        </div>
        <EventTypeFormDialog orgSlug={orgSlug} orgId={org.id} />
      </div>

      {eventTypes.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={CalendarDays} message="No custom event types yet — add one above." />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {eventTypes.map((et) => (
            <EventTypeRow
              key={et.id}
              orgSlug={orgSlug}
              orgId={org.id}
              eventType={{ id: et.id, name: et.name, trackAttendance: et.trackAttendance, sessionCount: et._count.sessions }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
