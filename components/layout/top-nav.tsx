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
import { ChevronsUpDown, ShieldCheck, LogOut, Check, UserCog } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/layout/theme-toggle";

type OrgOption = { orgId: string; orgSlug: string; orgName: string; roleName: string };

export function TopNav({
  orgName,
  orgSlug,
  roleName,
  userName,
  userEmail,
  orgOptions,
}: {
  orgName: string;
  orgSlug: string;
  roleName: string;
  userName: string;
  userEmail: string;
  orgOptions: OrgOption[];
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
                    <span>{o.orgName}</span>
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
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {roleName}
        </Badge>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
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
