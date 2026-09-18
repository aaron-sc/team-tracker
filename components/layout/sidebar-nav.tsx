"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Permission } from "@/lib/generated/prisma/enums";
import {
  LayoutDashboard,
  Users,
  Shield,
  CalendarClock,
  ClipboardList,
  MapPinned,
  Target,
  Megaphone,
  MessageCircle,
  Settings,
  GraduationCap,
  BarChart3,
  Package,
  Receipt,
  Swords,
  Handshake,
  Images,
} from "lucide-react";

const SETTINGS_PERMISSIONS: Permission[] = [
  Permission.org_settings_manage,
  Permission.org_roles_manage,
  Permission.org_members_manage,
  Permission.org_members_invite,
  Permission.audit_log_view,
  Permission.onboarding_manage,
];

export function SidebarNav({
  orgSlug,
  permissions,
  hiddenNavItems = [],
  chatEnabled = true,
  onNavigate,
}: {
  orgSlug: string;
  permissions: Permission[];
  /** Sidebar item keys (see lib/constants/nav-items.ts) this user has personally hidden — see
   *  NavbarCustomizeDialog. Dashboard is never in this list; it's the one link nobody can hide. */
  hiddenNavItems?: string[];
  /** Org-wide chat toggle (Settings -> Organization) — false hides Messages for everyone,
   *  regardless of personal nav preferences. */
  chatEnabled?: boolean;
  /** Called after a link is clicked — used by the mobile menu to close its sheet on navigation. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const base = `/${orgSlug}`;

  const has = (p: Permission) => permissions.includes(p);
  const hasAny = (ps: Permission[]) => ps.some((p) => permissions.includes(p));
  const isHidden = (key: string) => hiddenNavItems.includes(key);

  const items = [
    { href: `${base}/dashboard`, label: "Dashboard", icon: LayoutDashboard, show: true, tour: "nav-dashboard" },
    { href: `${base}/roster`, label: "Roster", icon: Users, show: !isHidden("sidebar_roster"), tour: "nav-roster" },
    { href: `${base}/teams`, label: "Teams", icon: Shield, show: !isHidden("sidebar_teams"), tour: "nav-teams" },
    {
      href: `${base}/strategies`,
      label: "Strategies",
      icon: Swords,
      show: !isHidden("sidebar_strategies"),
      tour: undefined,
    },
    {
      href: `${base}/schedule`,
      label: "Schedule",
      icon: CalendarClock,
      show: !isHidden("sidebar_schedule"),
      tour: "nav-schedule",
    },
    {
      href: `${base}/scrims`,
      label: "Scrim Finder",
      icon: Handshake,
      show: !isHidden("sidebar_scrims"),
      tour: undefined,
    },
    {
      href: `${base}/availability`,
      label: "Availability",
      icon: ClipboardList,
      show: !isHidden("sidebar_availability"),
      tour: undefined,
    },
    {
      href: `${base}/analytics`,
      label: "Analytics",
      icon: BarChart3,
      show: has(Permission.analytics_view) && !isHidden("sidebar_analytics"),
      tour: undefined,
    },
    { href: `${base}/venues`, label: "Venues", icon: MapPinned, show: !isHidden("sidebar_venues"), tour: undefined },
    {
      href: `${base}/recruitment`,
      label: "Recruitment",
      icon: Target,
      show: has(Permission.recruitment_view) && !isHidden("sidebar_recruitment"),
      tour: "nav-recruitment",
    },
    {
      href: `${base}/announcements`,
      label: "Announcements",
      icon: Megaphone,
      show: !isHidden("sidebar_announcements"),
      tour: undefined,
    },
    {
      href: `${base}/messages`,
      label: "Messages",
      icon: MessageCircle,
      show: chatEnabled && !isHidden("sidebar_messages"),
      tour: "nav-messages",
    },
    {
      href: `${base}/onboarding`,
      label: "Onboarding",
      icon: GraduationCap,
      show: !isHidden("sidebar_onboarding"),
      tour: undefined,
    },
    {
      href: `${base}/gear`,
      label: "Gear",
      icon: Package,
      show: has(Permission.gear_manage) && !isHidden("sidebar_gear"),
      tour: undefined,
    },
    {
      href: `${base}/assets`,
      label: "Assets",
      icon: Images,
      show: has(Permission.asset_manage) && !isHidden("sidebar_assets"),
      tour: undefined,
    },
    {
      href: `${base}/expenses`,
      label: "Expenses",
      icon: Receipt,
      show: has(Permission.expense_manage) && !isHidden("sidebar_expenses"),
      tour: undefined,
    },
    {
      href: `${base}/settings`,
      label: "Settings",
      icon: Settings,
      show: hasAny(SETTINGS_PERMISSIONS) && !isHidden("sidebar_settings"),
      tour: "nav-settings",
    },
  ];

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items
        .filter((i) => i.show)
        .map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour={item.tour}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}
