"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteProspectAction } from "@/lib/actions/prospects";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function DeleteProspectButton({ orgSlug, orgId, prospectId }: { orgSlug: string; orgId: string; prospectId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this prospect?")) return;
        startTransition(async () => {
          const result = await deleteProspectAction(orgSlug, orgId, prospectId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <Trash2 className="size-4" />
      Delete
    </Button>
  );
}
