import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopNav } from "@/components/layout/top-nav";
import { ProductTourAutoStart } from "@/components/onboarding/product-tour";
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

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { membershipId: membership.membershipId },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.notification.count({ where: { membershipId: membership.membershipId, isRead: false } }),
  ]);

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
      <ProductTourAutoStart />
      <TopNav
        orgName={org.name}
        orgSlug={org.slug}
        orgId={org.id}
        orgLogoUrl={org.logoUrl}
        roleName={membership.roleName}
        userName={session.user.name ?? session.user.email ?? "User"}
        userEmail={session.user.email ?? ""}
        orgOptions={session.memberships.map((m) => ({
          orgId: m.orgId,
          orgSlug: m.orgSlug,
          orgName: m.orgName,
          orgLogoUrl: m.orgLogoUrl,
          roleName: m.roleName,
        }))}
        initialNotifications={notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          linkUrl: n.linkUrl,
          isRead: n.isRead,
          createdAt: n.createdAt.toISOString(),
        }))}
        initialUnreadCount={unreadCount}
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
