import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { TeamForm } from "@/components/teams/team-form";
import { TeamLogoForm } from "@/components/teams/team-logo-form";
import { TeamDiscordPanel } from "@/components/teams/team-discord-panel";
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

        <div className="mb-6">
          <h2 className="mb-1 text-sm font-medium">Logo</h2>
          <TeamLogoForm orgSlug={orgSlug} orgId={org.id} teamId={team.id} teamName={team.name} logoUrl={team.logoUrl} />
        </div>

        <TeamForm action={action} defaultValues={{ name: team.name, game: team.game }} />
      </div>

      <div>
        <h2 className="mb-1 text-sm font-medium">Discord notifications</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Post this team&apos;s announcements and send reminders before matches, practices, and scrims to a Discord
          channel.
        </p>
        <TeamDiscordPanel
          orgSlug={orgSlug}
          orgId={org.id}
          teamId={team.id}
          webhookUrl={team.discordWebhookUrl}
          mentionRoleId={team.discordMentionRoleId}
          matchReminderMinutes={team.discordMatchReminderMinutes}
          practiceReminderMinutes={team.discordPracticeReminderMinutes}
          scrimReminderMinutes={team.discordScrimReminderMinutes}
        />
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
