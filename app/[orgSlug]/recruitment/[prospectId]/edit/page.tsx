import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { formatLinks } from "@/lib/validations/prospect";
import { ProspectForm } from "@/components/recruitment/prospect-form";
import { updateProspectAction } from "@/lib/actions/prospects";

export default async function EditProspectPage({
  params,
}: {
  params: Promise<{ orgSlug: string; prospectId: string }>;
}) {
  const { orgSlug, prospectId } = await params;
  const { org, membership, teams } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.recruitment_manage);

  const [prospect, levels] = await Promise.all([
    prisma.recruitmentProspect.findUnique({ where: { id: prospectId } }),
    prisma.prospectLevel.findMany({ where: { orgId: org.id }, orderBy: { order: "asc" } }),
  ]);
  if (!prospect || prospect.orgId !== org.id) notFound();

  const action = updateProspectAction.bind(null, orgSlug, org.id, prospect.id);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Edit prospect</h1>
      <ProspectForm
        action={action}
        teams={teams}
        levels={levels}
        defaultValues={{
          name: prospect.name,
          levelId: prospect.levelId ?? "",
          game: prospect.game,
          teamId: prospect.teamId ?? "",
          email: prospect.email ?? "",
          phone: prospect.phone ?? "",
          discordHandle: prospect.discordHandle ?? "",
          schoolOrOrg: prospect.schoolOrOrg ?? "",
          statsLinks: formatLinks(prospect.statsLinks),
          socialLinks: formatLinks(prospect.socialLinks),
          notes: prospect.notes ?? "",
        }}
      />
    </div>
  );
}
