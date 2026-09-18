import { ViewTransition } from "react";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopNav } from "@/components/layout/top-nav";
import { ProductTourAutoStart } from "@/components/onboarding/product-tour";
import { WhatsNewDialog } from "@/components/layout/whats-new-dialog";
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

  const [notifications, unreadCount, userNavPrefs] = await Promise.all([
    prisma.notification.findMany({
      where: { membershipId: membership.membershipId },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.notification.count({ where: { membershipId: membership.membershipId, isRead: false } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { hiddenNavItems: true } }),
  ]);
  const hiddenNavItems = Array.isArray(userNavPrefs?.hiddenNavItems) ? (userNavPrefs.hiddenNavItems as string[]) : [];

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
      <WhatsNewDialog />
      <div className="no-print contents">
        <TopNav
          orgName={org.name}
          orgSlug={org.slug}
          orgId={org.id}
          orgLogoUrl={org.logoUrl}
          orgWebsiteUrl={org.websiteUrl}
          roleName={membership.roleName}
          permissions={membership.permissions}
          userName={session.user.name ?? session.user.email ?? "User"}
          userEmail={session.user.email ?? ""}
          userImage={session.user.image ?? null}
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
          hiddenNavItems={hiddenNavItems}
          chatEnabled={org.chatEnabled}
        />
      </div>
      <div className="flex flex-1">
        <aside
          className="no-print hidden w-56 shrink-0 border-r sm:block"
          style={{ viewTransitionName: "site-sidebar" } as React.CSSProperties}
        >
          <SidebarNav
            orgSlug={org.slug}
            permissions={membership.permissions}
            hiddenNavItems={hiddenNavItems}
            chatEnabled={org.chatEnabled}
          />
        </aside>
        <main className="flex-1 overflow-x-hidden bg-muted/20 p-6">
          <ViewTransition name="app-content" enter="auto" exit="auto">
            {children}
          </ViewTransition>
        </main>
      </div>
    </div>
  );
}
