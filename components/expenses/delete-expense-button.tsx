"use client";

import { useTransition } from "react";
import { deleteExpenseAction } from "@/lib/actions/expenses";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteExpenseButton({ orgSlug, orgId, expenseId }: { orgSlug: string; orgId: string; expenseId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this expense?")) return;
        startTransition(async () => {
          const result = await deleteExpenseAction(orgSlug, orgId, expenseId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </Button>
  );
}
