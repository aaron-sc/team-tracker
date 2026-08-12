import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { OrgProfileForm } from "@/components/settings/org-profile-form";
import { OrgLogoForm } from "@/components/settings/org-logo-form";
import { Button } from "@/components/ui/button";
import { DatabaseBackup } from "lucide-react";
import { getTimezones } from "@/lib/utils/timezones";

export default async function OrgSettingsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.org_settings_manage);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 text-lg font-medium">Logo</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Shown in the sidebar and organization picker.
        </p>
        <OrgLogoForm orgSlug={orgSlug} orgId={org.id} orgName={org.name} logoUrl={org.logoUrl} />
      </div>

      <div>
        <h2 className="mb-1 text-lg font-medium">Organization profile</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Basic details about your organization. The timezone is used as the default for scheduling.
        </p>
        <OrgProfileForm
          orgSlug={orgSlug}
          orgId={org.id}
          name={org.name}
          timezone={org.timezone}
          timezones={getTimezones()}
          themeColor={org.themeColor}
        />
      </div>

      <div>
        <h2 className="mb-1 text-lg font-medium">Data export</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Download a JSON backup of your organization&apos;s teams, roster, schedule, venues, and recruitment data.
        </p>
        <Button variant="outline" asChild>
          <a href={`/${orgSlug}/settings/export`} download>
            <DatabaseBackup className="size-4" />
            Export org data (JSON)
          </a>
        </Button>
      </div>
    </div>
  );
}
