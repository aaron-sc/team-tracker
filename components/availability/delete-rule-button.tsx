"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteAvailabilityRuleAction } from "@/lib/actions/availability";
import { toast } from "sonner";
import { X } from "lucide-react";

export function DeleteRuleButton({
  orgSlug,
  orgId,
  membershipId,
  ruleId,
}: {
  orgSlug: string;
  orgId: string;
  membershipId: string;
  ruleId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await deleteAvailabilityRuleAction(orgSlug, orgId, membershipId, ruleId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <X className="size-3.5" />
    </Button>
  );
}
