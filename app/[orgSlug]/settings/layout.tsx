import { getOrgContext } from "@/lib/org/context";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { Permission } from "@/lib/generated/prisma/enums";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { membership } = await getOrgContext(orgSlug);
  const has = (p: Permission) => membership.permissions.includes(p);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Settings</h1>
      <SettingsTabs
        orgSlug={orgSlug}
        tabs={[
          { href: "", label: "Organization", show: has(Permission.org_settings_manage) },
          { href: "/roles", label: "Roles", show: has(Permission.org_roles_manage) },
          {
            href: "/members",
            label: "Members",
            show: has(Permission.org_members_invite) || has(Permission.org_members_manage),
          },
          { href: "/audit-log", label: "Audit Log", show: has(Permission.audit_log_view) },
          { href: "/integrations", label: "Integrations", show: has(Permission.org_settings_manage) },
        ]}
      />
      {children}
    </div>
  );
}
