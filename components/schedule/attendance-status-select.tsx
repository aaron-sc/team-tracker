"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { respondToAttendanceAction, manageAttendanceAction } from "@/lib/actions/practice-sessions";
import { toast } from "sonner";

const STATUSES = ["INVITED", "CONFIRMED", "DECLINED", "ATTENDED", "ABSENT", "LATE"] as const;

export function AttendanceStatusSelect({
  orgSlug,
  orgId,
  attendanceId,
  status,
  mode,
}: {
  orgSlug: string;
  orgId: string;
  attendanceId: string;
  status: string;
  mode: "self" | "manage";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={status}
      disabled={pending}
      onValueChange={(next) => {
        startTransition(async () => {
          const action = mode === "self" ? respondToAttendanceAction : manageAttendanceAction;
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
