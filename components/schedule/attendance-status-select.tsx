"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  respondToAttendanceAction,
  manageAttendanceAction,
} from "@/lib/actions/practice-sessions";
import { respondToMatchAttendanceAction, manageMatchAttendanceAction } from "@/lib/actions/matches";
import { toast } from "sonner";

const STATUSES = ["INVITED", "CONFIRMED", "DECLINED", "ATTENDED", "ABSENT", "LATE"] as const;

const ACTIONS_BY_KIND = {
  practice: { self: respondToAttendanceAction, manage: manageAttendanceAction },
  match: { self: respondToMatchAttendanceAction, manage: manageMatchAttendanceAction },
} as const;

export function AttendanceStatusSelect({
  orgSlug,
  orgId,
  attendanceId,
  status,
  mode,
  kind = "practice",
}: {
  orgSlug: string;
  orgId: string;
  attendanceId: string;
  status: string;
  mode: "self" | "manage";
  /** Which attendance model attendanceId belongs to — defaults to "practice" so every existing
   *  call site (which only ever dealt with practice sessions) keeps working unchanged. */
  kind?: "practice" | "match";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={status}
      disabled={pending}
      onValueChange={(next) => {
        startTransition(async () => {
          const action = ACTIONS_BY_KIND[kind][mode === "self" ? "self" : "manage"];
          const result = await action(orgSlug, orgId, attendanceId, next);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <SelectTrigger size="sm" className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
