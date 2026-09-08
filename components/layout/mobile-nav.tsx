"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { Permission } from "@/lib/generated/prisma/enums";

/** The full section nav (Roster, Schedule, Strategies, etc.) lives in a sidebar that's hidden
 *  below the sm breakpoint — this is the only way to reach it on a phone. The header's own
 *  org-switcher dropdown is also desktop-only (it doesn't fit next to this menu button and the
 *  header's icons on a narrow phone), so its "switch/create an organization" job moves here too. */
export function MobileNav({ orgSlug, permissions }: { orgSlug: string; permissions: Permission[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0 sm:hidden" aria-label="Open navigation menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-64 flex-col gap-0 p-0">
        <SheetHeader className="border-b">
          <SheetTitle>Navigate</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav orgSlug={orgSlug} permissions={permissions} onNavigate={() => setOpen(false)} />
        </div>
        <div className="shrink-0 border-t p-3">
          <Link
            href="/orgs"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeftRight className="size-4" />
            Switch organization
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
