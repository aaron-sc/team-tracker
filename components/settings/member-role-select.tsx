"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeMemberRoleAction } from "@/lib/actions/members";
import { toast } from "sonner";

export function MemberRoleSelect({
  orgSlug,
  orgId,
  membershipId,
  roleId,
  roles,
  disabled,
}: {
  orgSlug: string;
  orgId: string;
  membershipId: string;
  roleId: string;
  roles: { id: string; name: string }[];
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={roleId}
      disabled={disabled || pending}
      onValueChange={(newRoleId) => {
        startTransition(async () => {
          const result = await changeMemberRoleAction(orgSlug, orgId, membershipId, newRoleId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <SelectTrigger size="sm" className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {roles.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            {r.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
