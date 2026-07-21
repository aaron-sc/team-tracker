import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { MatchForm } from "@/components/schedule/match-form";
import { updateMatchAction } from "@/lib/actions/matches";

function toLocalDateTimeInput(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export default async function EditMatchPage({
  params,
}: {
  params: Promise<{ orgSlug: string; matchId: string }>;
}) {
  const { orgSlug, matchId } = await params;
  const { org, membership, teams } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.match_edit);

  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { team: true } });
  if (!match || match.team.orgId !== org.id) notFound();

  const [opponents, venues] = await Promise.all([
    prisma.opponent.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
    prisma.venue.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
  ]);

  const action = updateMatchAction.bind(null, orgSlug, org.id, match.id);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Edit match</h1>
      <MatchForm
        action={action}
        teams={teams}
        opponents={opponents}
        venues={venues}
        lockTeam
        defaultValues={{
          teamId: match.teamId,
          opponentId: match.opponentId,
          scheduledAt: toLocalDateTimeInput(match.scheduledAt),
          format: match.format,
          locationType: match.locationType,
          venueId: match.venueId ?? undefined,
          isStreamed: match.isStreamed,
          streamPlatform: match.streamPlatform ?? "",
          streamUrl: match.streamUrl ?? "",
          casterName: match.casterName ?? "",
          notes: match.notes ?? "",
        }}
      />
    </div>
  );
}
