"use client";

import { useTransition } from "react";
import { deleteGearItemAction } from "@/lib/actions/gear";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteGearItemButton({ orgSlug, orgId, gearItemId }: { orgSlug: string; orgId: string; gearItemId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this gear item?")) return;
        startTransition(async () => {
          const result = await deleteGearItemAction(orgSlug, orgId, gearItemId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </Button>
  );
}
