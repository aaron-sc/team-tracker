import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { TeamForm } from "@/components/teams/team-form";
import { updateTeamAction } from "@/lib/actions/teams";
import { DeleteTeamButton } from "@/components/teams/delete-team-button";

export default async function EditTeamPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string }>;
}) {
  const { orgSlug, teamSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.team_edit);

  const team = await prisma.team.findUnique({ where: { orgId_slug: { orgId: org.id, slug: teamSlug } } });
  if (!team) notFound();

  const action = updateTeamAction.bind(null, orgSlug, org.id, team.id);
  const canDelete = membership.permissions.includes(Permission.team_delete);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-4 text-xl font-semibold">Edit team</h1>
        <TeamForm action={action} defaultValues={{ name: team.name, game: team.game, logoUrl: team.logoUrl ?? "" }} />
      </div>

      {canDelete ? (
        <div className="max-w-md rounded-lg border border-destructive/30 p-4">
          <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Deleting a team removes its roster assignments, matches, and practice sessions.
          </p>
          <DeleteTeamButton orgSlug={orgSlug} orgId={org.id} teamId={team.id} />
        </div>
      ) : null}
    </div>
  );
}
