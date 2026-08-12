"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteAvailabilityRuleGroupAction } from "@/lib/actions/availability";
import { toast } from "sonner";
import { X } from "lucide-react";

export function DeleteRuleGroupButton({
  orgSlug,
  orgId,
  membershipId,
  ruleIds,
}: {
  orgSlug: string;
  orgId: string;
  membershipId: string;
  ruleIds: string[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await deleteAvailabilityRuleGroupAction(orgSlug, orgId, membershipId, ruleIds);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <X className="size-3.5" />
    </Button>
  );
}
