"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { duplicateStrategyAction } from "@/lib/actions/strategies";
import { toast } from "sonner";
import { CopyPlus, Loader2 } from "lucide-react";

export function DuplicateStrategyButton({
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
        startTransition(async () => {
          const result = await duplicateStrategyAction(orgSlug, orgId, strategyId, teamSlug);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <CopyPlus className="size-3.5" />}
    </Button>
  );
}
