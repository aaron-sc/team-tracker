import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { PracticeForm } from "@/components/schedule/practice-form";
import { updatePracticeSessionAction } from "@/lib/actions/practice-sessions";
import { toDatetimeLocalValue } from "@/lib/utils/format-time";

export default async function EditPracticeSessionPage({
  params,
}: {
  params: Promise<{ orgSlug: string; sessionId: string }>;
}) {
  const { orgSlug, sessionId } = await params;
  const { org, membership, teams } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.practice_edit);

  const session = await prisma.practiceSession.findUnique({ where: { id: sessionId }, include: { team: true } });
  if (!session || session.team.orgId !== org.id) notFound();

  const [opponents, venues] = await Promise.all([
    prisma.opponent.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
    prisma.venue.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
  ]);

  const action = updatePracticeSessionAction.bind(null, orgSlug, org.id, session.id);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Edit session</h1>
      <PracticeForm
        action={action}
        teams={teams}
        opponents={opponents}
        venues={venues}
        lockTeam
        defaultValues={{
          teamId: session.teamId,
          type: session.type,
          opponentId: session.opponentId ?? undefined,
          scheduledAt: toDatetimeLocalValue(session.scheduledAt, session.timezone),
          durationMinutes: session.durationMinutes,
          locationType: session.locationType,
          venueId: session.venueId ?? undefined,
          notes: session.notes ?? "",
        }}
      />
    </div>
  );
}
