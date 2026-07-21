import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { AnnouncementForm } from "@/components/announcements/announcement-form";
import { createAnnouncementAction } from "@/lib/actions/announcements";

export default async function NewAnnouncementPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership, teams } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.announcement_create);

  const action = createAnnouncementAction.bind(null, orgSlug, org.id);
  const canPin = membership.permissions.includes(Permission.announcement_pin);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">New announcement</h1>
      <AnnouncementForm action={action} teams={teams} canPin={canPin} />
    </div>
  );
}
