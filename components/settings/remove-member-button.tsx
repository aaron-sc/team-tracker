"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removeMemberAction } from "@/lib/actions/members";
import { toast } from "sonner";
import { UserX } from "lucide-react";

export function RemoveMemberButton({
  orgSlug,
  orgId,
  membershipId,
  disabled,
}: {
  orgSlug: string;
  orgId: string;
  membershipId: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || pending}
      onClick={() => {
        if (!confirm("Remove this member from the organization?")) return;
        startTransition(async () => {
          const result = await removeMemberAction(orgSlug, orgId, membershipId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <UserX className="size-4" />
    </Button>
  );
}
