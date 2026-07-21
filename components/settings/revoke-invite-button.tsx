"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { revokeInviteAction } from "@/lib/actions/members";
import { toast } from "sonner";

export function RevokeInviteButton({ orgSlug, orgId, inviteId }: { orgSlug: string; orgId: string; inviteId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await revokeInviteAction(orgSlug, orgId, inviteId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      Revoke
    </Button>
  );
}
