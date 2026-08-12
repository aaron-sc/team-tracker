"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { duplicateMatchAction } from "@/lib/actions/matches";
import { toast } from "sonner";
import { CopyPlus } from "lucide-react";

export function DuplicateMatchButton({ orgSlug, orgId, matchId }: { orgSlug: string; orgId: string; matchId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await duplicateMatchAction(orgSlug, orgId, matchId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <CopyPlus className="size-4" />
      Duplicate to next week
    </Button>
  );
}
