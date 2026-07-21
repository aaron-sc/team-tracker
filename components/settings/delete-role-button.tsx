"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteRoleAction } from "@/lib/actions/roles";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function DeleteRoleButton({
  orgSlug,
  orgId,
  roleId,
  disabled,
}: {
  orgSlug: string;
  orgId: string;
  roleId: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || pending}
      title={disabled ? "Reassign members off this role first" : undefined}
      onClick={() => {
        if (!confirm("Delete this role? This can't be undone.")) return;
        startTransition(async () => {
          const result = await deleteRoleAction(orgSlug, orgId, roleId);
          if (result?.error) toast.error(result.error);
          else toast.success("Role deleted.");
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
