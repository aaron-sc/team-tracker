"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { duplicatePracticeSessionAction } from "@/lib/actions/practice-sessions";
import { toast } from "sonner";
import { CopyPlus } from "lucide-react";

export function DuplicatePracticeButton({ orgSlug, orgId, sessionId }: { orgSlug: string; orgId: string; sessionId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await duplicatePracticeSessionAction(orgSlug, orgId, sessionId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <CopyPlus className="size-4" />
      Duplicate to next week
    </Button>
  );
}
