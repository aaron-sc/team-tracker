"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SettingsTabs({
  orgSlug,
  tabs,
}: {
  orgSlug: string;
  tabs: { href: string; label: string; show: boolean }[];
}) {
  const pathname = usePathname();
  const base = `/${orgSlug}/settings`;

  return (
    <div className="mb-6 flex gap-1 border-b">
      {tabs
        .filter((t) => t.show)
        .map((tab) => {
          const href = `${base}${tab.href}`;
          const active = pathname === href || (tab.href === "" && pathname === base);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
    </div>
  );
}
