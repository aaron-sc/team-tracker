import { getOrgContext } from "@/lib/org/context";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopNav } from "@/components/layout/top-nav";
import { getContrastColor } from "@/lib/utils/color";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { session, membership, org } = await getOrgContext(orgSlug);

  const accentStyle = {
    "--primary": org.themeColor,
    "--primary-foreground": getContrastColor(org.themeColor),
    "--ring": org.themeColor,
    "--sidebar-primary": org.themeColor,
    "--sidebar-primary-foreground": getContrastColor(org.themeColor),
    "--sidebar-ring": org.themeColor,
  } as React.CSSProperties;

  return (
    <div className="flex min-h-screen flex-1 flex-col" style={accentStyle}>
      <TopNav
        orgName={org.name}
        orgSlug={org.slug}
        roleName={membership.roleName}
        userName={session.user.name ?? session.user.email ?? "User"}
        userEmail={session.user.email ?? ""}
        orgOptions={session.memberships.map((m) => ({
          orgId: m.orgId,
          orgSlug: m.orgSlug,
          orgName: m.orgName,
          roleName: m.roleName,
        }))}
      />
      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r sm:block">
          <SidebarNav orgSlug={org.slug} permissions={membership.permissions} />
        </aside>
        <main className="flex-1 overflow-x-hidden bg-muted/20 p-6">{children}</main>
      </div>
    </div>
  );
}
