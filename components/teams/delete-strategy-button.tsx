"use client";

import { useTransition } from "react";
import { deleteStrategyAction } from "@/lib/actions/strategies";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteStrategyButton({
  orgSlug,
  orgId,
  strategyId,
  teamSlug,
}: {
  orgSlug: string;
  orgId: string;
  strategyId: string;
  teamSlug: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this strategy?")) return;
        startTransition(async () => {
          const result = await deleteStrategyAction(orgSlug, orgId, strategyId, teamSlug);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </Button>
  );
}
