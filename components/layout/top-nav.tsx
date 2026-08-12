"use client";

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
import { ChevronsUpDown, ShieldCheck, LogOut, Check, UserCog, Compass } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { CommandPalette } from "@/components/layout/command-palette";
import { KeyboardShortcutsDialog } from "@/components/layout/keyboard-shortcuts-dialog";
import { startProductTour } from "@/components/onboarding/product-tour";

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
  roleName,
  userName,
  userEmail,
  orgOptions,
  initialNotifications,
  initialUnreadCount,
}: {
  orgName: string;
  orgSlug: string;
  orgId: string;
  orgLogoUrl: string | null;
  roleName: string;
  userName: string;
  userEmail: string;
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

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-5 text-primary" />
          <span className="hidden sm:inline">Formation</span>
        </Link>
        {orgLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={orgLogoUrl} alt={orgName} className="size-6 rounded object-cover" />
        ) : null}
        {orgOptions.length > 1 ? (
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
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={o.orgLogoUrl} alt="" className="size-4 rounded object-cover" />
                      ) : null}
                      {o.orgName}
                    </span>
                    {o.orgSlug === orgSlug ? <Check className="size-4" /> : null}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="text-sm font-medium text-muted-foreground">{orgName}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span data-tour="search" className="contents">
          <CommandPalette orgId={orgId} />
        </span>
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
                <AvatarFallback>{initials || "?"}</AvatarFallback>
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
