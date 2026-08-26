"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { leaveOrgAction } from "@/lib/actions/leave-org";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";

export function LeaveOrgButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        <LogOut className="size-4" />
        Leave
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Leave {orgName}?</span>
      <Button variant="outline" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await leaveOrgAction(orgId);
            if (result?.error) {
              toast.error(result.error);
              setConfirming(false);
            } else {
              toast.success(result?.success ?? "Left the organization.");
              router.refresh();
            }
          });
        }}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Confirm leave
      </Button>
    </div>
  );
}
