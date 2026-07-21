"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deletePracticeSessionAction } from "@/lib/actions/practice-sessions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function DeletePracticeButton({ orgSlug, orgId, sessionId }: { orgSlug: string; orgId: string; sessionId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this session?")) return;
        startTransition(async () => {
          const result = await deletePracticeSessionAction(orgSlug, orgId, sessionId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <Trash2 className="size-4" />
      Delete
    </Button>
  );
}
