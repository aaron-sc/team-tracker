"use client";

import { useTransition } from "react";
import { deleteAssetAction } from "@/lib/actions/assets";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteAssetButton({ orgSlug, orgId, assetId }: { orgSlug: string; orgId: string; assetId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this asset?")) return;
        startTransition(async () => {
          const result = await deleteAssetAction(orgSlug, orgId, assetId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </Button>
  );
}
