"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { respondToAttendanceAction } from "@/lib/actions/practice-sessions";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

export function RsvpQuickActions({ orgSlug, orgId, attendanceId }: { orgSlug: string; orgId: string; attendanceId: string }) {
  const [pending, startTransition] = useTransition();

  function respond(status: "CONFIRMED" | "DECLINED") {
    startTransition(async () => {
      const result = await respondToAttendanceAction(orgSlug, orgId, attendanceId, status);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="flex shrink-0 gap-1.5">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => respond("CONFIRMED")}>
        <Check className="size-3.5" />
        I&apos;m in
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => respond("DECLINED")}>
        <X className="size-3.5" />
        Can&apos;t make it
      </Button>
    </div>
  );
}
