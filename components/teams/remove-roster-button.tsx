"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removeFromRosterAction } from "@/lib/actions/teams";
import { toast } from "sonner";
import { X } from "lucide-react";

export function RemoveRosterButton({
  orgSlug,
  orgId,
  teamMembershipId,
}: {
  orgSlug: string;
  orgId: string;
  teamMembershipId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this player from the roster?")) return;
        startTransition(async () => {
          const result = await removeFromRosterAction(orgSlug, orgId, teamMembershipId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <X className="size-4" />
    </Button>
  );
}
