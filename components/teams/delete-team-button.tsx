"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteTeamAction } from "@/lib/actions/teams";
import { toast } from "sonner";

export function DeleteTeamButton({ orgSlug, orgId, teamId }: { orgSlug: string; orgId: string; teamId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this team? This can't be undone.")) return;
        startTransition(async () => {
          const result = await deleteTeamAction(orgSlug, orgId, teamId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      Delete team
    </Button>
  );
}
