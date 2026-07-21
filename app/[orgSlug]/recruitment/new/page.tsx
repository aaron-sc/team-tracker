import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { ProspectForm } from "@/components/recruitment/prospect-form";
import { createProspectAction } from "@/lib/actions/prospects";

export default async function NewProspectPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership, teams } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.recruitment_manage);

  const action = createProspectAction.bind(null, orgSlug, org.id);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">New prospect</h1>
      <ProspectForm action={action} teams={teams} />
    </div>
  );
}
