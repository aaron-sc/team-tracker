"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteMatchAction } from "@/lib/actions/matches";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function DeleteMatchButton({ orgSlug, orgId, matchId }: { orgSlug: string; orgId: string; matchId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this match?")) return;
        startTransition(async () => {
          const result = await deleteMatchAction(orgSlug, orgId, matchId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <Trash2 className="size-4" />
      Delete
    </Button>
  );
}
