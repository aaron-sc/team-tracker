"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteAvailabilityExceptionAction } from "@/lib/actions/availability";
import { toast } from "sonner";
import { X } from "lucide-react";

export function DeleteExceptionButton({
  orgSlug,
  orgId,
  membershipId,
  exceptionId,
}: {
  orgSlug: string;
  orgId: string;
  membershipId: string;
  exceptionId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await deleteAvailabilityExceptionAction(orgSlug, orgId, membershipId, exceptionId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <X className="size-3.5" />
    </Button>
  );
}
