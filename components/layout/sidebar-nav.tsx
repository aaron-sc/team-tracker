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
  Settings,
} from "lucide-react";

const SETTINGS_PERMISSIONS: Permission[] = [
  Permission.org_settings_manage,
  Permission.org_roles_manage,
  Permission.org_members_manage,
  Permission.org_members_invite,
  Permission.audit_log_view,
];

export function SidebarNav({ orgSlug, permissions }: { orgSlug: string; permissions: Permission[] }) {
  const pathname = usePathname();
  const base = `/${orgSlug}`;

  const has = (p: Permission) => permissions.includes(p);
  const hasAny = (ps: Permission[]) => ps.some((p) => permissions.includes(p));

  const items = [
    { href: `${base}/dashboard`, label: "Dashboard", icon: LayoutDashboard, show: true },
    { href: `${base}/roster`, label: "Roster", icon: Users, show: true },
    { href: `${base}/teams`, label: "Teams", icon: Shield, show: true },
    { href: `${base}/schedule`, label: "Schedule", icon: CalendarClock, show: true },
    { href: `${base}/availability`, label: "Availability", icon: ClipboardList, show: true },
    { href: `${base}/venues`, label: "Venues", icon: MapPinned, show: true },
    { href: `${base}/recruitment`, label: "Recruitment", icon: Target, show: has(Permission.recruitment_view) },
    { href: `${base}/announcements`, label: "Announcements", icon: Megaphone, show: true },
    { href: `${base}/settings`, label: "Settings", icon: Settings, show: hasAny(SETTINGS_PERMISSIONS) },
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
