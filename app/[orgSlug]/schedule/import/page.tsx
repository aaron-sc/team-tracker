import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { IcsImportWizard } from "@/components/schedule/ics-import-wizard";

export default async function IcsImportPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership, teams } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.practice_create);

  const eventTypes = await prisma.eventType.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } });

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-xl font-semibold">Import from calendar (.ics)</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Bring practices, scrims, or events in from an external calendar export — a league schedule, an old Google
        Calendar, whatever you&apos;ve got.
      </p>
      <IcsImportWizard orgSlug={orgSlug} orgId={org.id} teams={teams} eventTypes={eventTypes} orgTimezone={org.timezone} />
    </div>
  );
}
