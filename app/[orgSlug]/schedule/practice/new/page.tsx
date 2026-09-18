import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { PracticeForm } from "@/components/schedule/practice-form";
import { createPracticeSessionAction } from "@/lib/actions/practice-sessions";

const PRACTICE_FORM_TYPES = ["PRACTICE", "SCRIM", "EVENT"];

export default async function NewPracticeSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { orgSlug } = await params;
  const { type } = await searchParams;
  const { org, membership, teams } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.practice_create);

  const [opponents, venues, eventTypes] = await Promise.all([
    prisma.opponent.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
    prisma.venue.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
    prisma.eventType.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
  ]);

  const initialType = type && PRACTICE_FORM_TYPES.includes(type) ? type : undefined;

  const action = createPracticeSessionAction.bind(null, orgSlug, org.id);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Schedule practice / scrim / event</h1>
      <PracticeForm
        action={action}
        teams={teams}
        opponents={opponents}
        venues={venues}
        eventTypes={eventTypes}
        orgSlug={orgSlug}
        orgTimezone={org.timezone}
        defaultValues={initialType ? { type: initialType } : undefined}
      />
    </div>
  );
}
