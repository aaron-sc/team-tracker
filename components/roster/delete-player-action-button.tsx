"use client";

import { useTransition } from "react";
import { deletePlayerActionAction } from "@/lib/actions/player-actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";

export function DeletePlayerActionButton({
  orgSlug,
  orgId,
  playerActionId,
  membershipId,
}: {
  orgSlug: string;
  orgId: string;
  playerActionId: string;
  membershipId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this record?")) return;
        startTransition(async () => {
          const result = await deletePlayerActionAction(orgSlug, orgId, playerActionId, membershipId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </Button>
  );
}
