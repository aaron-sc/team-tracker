"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Swords, Handshake, Dumbbell, CalendarDays } from "lucide-react";

/** Single "Schedule event" entry point replacing separate Match/Practice buttons — picks the
 *  kind first, then routes to the right form. Scrim/Practice/Custom event all land on the same
 *  practice form (see PracticeForm's `type` select) with that type pre-selected via ?type=. */
export function ScheduleEventMenu({
  orgSlug,
  canCreateMatch,
  canCreatePractice,
}: {
  orgSlug: string;
  canCreateMatch: boolean;
  canCreatePractice: boolean;
}) {
  if (!canCreateMatch && !canCreatePractice) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" />
          Schedule event
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>What kind?</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canCreateMatch ? (
          <DropdownMenuItem asChild>
            <Link href={`/${orgSlug}/schedule/matches/new`}>
              <Swords className="size-4" />
              Match
            </Link>
          </DropdownMenuItem>
        ) : null}
        {canCreatePractice ? (
          <>
            <DropdownMenuItem asChild>
              <Link href={`/${orgSlug}/schedule/practice/new?type=SCRIM`}>
                <Handshake className="size-4" />
                Scrim
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${orgSlug}/schedule/practice/new?type=PRACTICE`}>
                <Dumbbell className="size-4" />
                Practice
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${orgSlug}/schedule/practice/new?type=EVENT`}>
                <CalendarDays className="size-4" />
                Custom event
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
