import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { TeamForm } from "@/components/teams/team-form";
import { createTeamAction } from "@/lib/actions/teams";

export default async function NewTeamPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.team_create);

  const action = createTeamAction.bind(null, orgSlug, org.id);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">New team</h1>
      <TeamForm action={action} />
    </div>
  );
}
