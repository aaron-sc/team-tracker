"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/actions/types";

/** Removes one person from a match/practice's attendance list without touching their spot on the
 *  team's actual roster — for someone benched or unavailable for this one event specifically. */
export function RemoveAttendeeButton({ onRemove }: { onRemove: () => Promise<ActionState> }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      title="Remove from this event"
      onClick={() => {
        startTransition(async () => {
          const result = await onRemove();
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <X className="size-3.5" />
    </Button>
  );
}
