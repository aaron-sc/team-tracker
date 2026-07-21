import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { PracticeForm } from "@/components/schedule/practice-form";
import { createPracticeSessionAction } from "@/lib/actions/practice-sessions";

export default async function NewPracticeSessionPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership, teams } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.practice_create);

  const [opponents, venues] = await Promise.all([
    prisma.opponent.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
    prisma.venue.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
  ]);

  const action = createPracticeSessionAction.bind(null, orgSlug, org.id);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Schedule practice / scrim</h1>
      <PracticeForm action={action} teams={teams} opponents={opponents} venues={venues} />
    </div>
  );
}
