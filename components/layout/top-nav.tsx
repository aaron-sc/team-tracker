"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronsUpDown, LogOut, Check, UserCog, Compass, Plus, Sparkles, BookOpen } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { logoutAction } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { CommandPalette } from "@/components/layout/command-palette";
import { KeyboardShortcutsDialog } from "@/components/layout/keyboard-shortcuts-dialog";
import { KeyboardNav } from "@/components/layout/keyboard-nav";
import { CreateOrgDialog } from "@/components/auth/create-org-dialog";
import { startProductTour } from "@/components/onboarding/product-tour";
import { openWhatsNew } from "@/components/layout/whats-new-dialog";
import { FeatureRequestDialog } from "@/components/layout/feature-request-dialog";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { Permission } from "@/lib/generated/prisma/enums";

type OrgOption = { orgId: string; orgSlug: string; orgName: string; orgLogoUrl: string | null; roleName: string };
type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

export function TopNav({
  orgName,
  orgSlug,
  orgId,
  orgLogoUrl,
  orgWebsiteUrl,
  roleName,
  permissions,
  userName,
  userEmail,
  userImage,
  orgOptions,
  initialNotifications,
  initialUnreadCount,
}: {
  orgName: string;
  orgSlug: string;
  orgId: string;
  orgLogoUrl: string | null;
  orgWebsiteUrl: string | null;
  roleName: string;
  permissions: Permission[];
  userName: string;
  userEmail: string;
  userImage: string | null;
  orgOptions: OrgOption[];
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
}) {
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const [createOrgOpen, setCreateOrgOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/70 px-4 backdrop-blur-md supports-backdrop-filter:bg-background/60"
      style={{ viewTransitionName: "site-header" } as React.CSSProperties}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <MobileNav orgSlug={orgSlug} permissions={permissions} />
        <Link href="/" className="hidden font-semibold sm:flex">
          <Logo size="size-5" />
        </Link>
        {/* Org logo + the full switch-organization dropdown — desktop only. The dropdown's
            trigger button can't shrink below its label, so on a narrow phone header it just
            collides with the icons on the other side; the mobile nav sheet offers a "Switch
            organization" link instead, and the plain label below covers "which org am I in". */}
        <span className="hidden sm:contents">
          {orgLogoUrl ? (
            orgWebsiteUrl ? (
              <a
                href={orgWebsiteUrl}
                target="_blank"
                rel="noreferrer"
                title={`Visit ${orgName}'s website`}
                className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background transition-opacity hover:opacity-80"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={orgLogoUrl} alt={orgName} className="size-full object-contain" />
              </a>
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={orgLogoUrl} alt={orgName} className="size-full object-contain" />
              </span>
            )
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                {orgName}
                <ChevronsUpDown className="size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Switch organization</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {orgOptions.map((o) => (
                <DropdownMenuItem key={o.orgId} asChild>
                  <Link href={`/${o.orgSlug}/dashboard`} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {o.orgLogoUrl ? (
                        <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded border bg-background">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={o.orgLogoUrl} alt="" className="size-full object-contain" />
                        </span>
                      ) : null}
                      {o.orgName}
                    </span>
                    {o.orgSlug === orgSlug ? <Check className="size-4" /> : null}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setCreateOrgOpen(true);
                }}
              >
                <Plus className="size-4" />
                Create new organization
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
        {/* Mobile-only stand-in for the dropdown above — just enough to show which org you're
            in; switching happens from the "Switch organization" link in the nav sheet instead. */}
        <span className="min-w-0 truncate text-sm font-medium sm:hidden">{orgName}</span>
      </div>
      <CreateOrgDialog open={createOrgOpen} onOpenChange={setCreateOrgOpen} />

      <div className="flex items-center gap-3">
        <KeyboardNav orgSlug={orgSlug} />
        <span data-tour="search" className="contents">
          <CommandPalette orgId={orgId} />
        </span>
        <FeatureRequestDialog orgName={orgName} />
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {roleName}
        </Badge>
        <span data-tour="notifications" className="contents">
          <NotificationBell orgId={orgId} initialNotifications={initialNotifications} initialUnreadCount={initialUnreadCount} />
        </span>
        <KeyboardShortcutsDialog />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" data-tour="user-menu">
              <Avatar className="size-8">
                {userImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userImage} alt={userName} className="size-full rounded-full object-cover" />
                ) : (
                  <AvatarFallback>{initials || "?"}</AvatarFallback>
                )}
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{userName}</span>
                <span className="text-xs text-muted-foreground">{userEmail}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/orgs">All organizations</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account">
                <UserCog className="size-4" />
                Account &amp; password
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => startProductTour()}>
              <Compass className="size-4" />
              Take a tour
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openWhatsNew()}>
              <Sparkles className="size-4" />
              What&apos;s new
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/guide">
                <BookOpen className="size-4" />
                User guide
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={logoutAction} className="w-full">
              <button type="submit" className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-destructive">
                <LogOut className="size-4" />
                Log out
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
