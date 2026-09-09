"use client";

import { useState, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { changeMemberRoleAction } from "@/lib/actions/members";
import { toast } from "sonner";

/** Role changes take effect immediately and change what someone can see and do — a single
 *  misclick on the dropdown shouldn't be enough to demote an Owner or promote a Player. Confirms
 *  before committing, and reverts the visible selection if the action itself is rejected. */
export function MemberRoleSelect({
  orgSlug,
  orgId,
  membershipId,
  memberName,
  roleId,
  roleName,
  roles,
  disabled,
}: {
  orgSlug: string;
  orgId: string;
  membershipId: string;
  memberName: string;
  roleId: string;
  roleName: string;
  roles: { id: string; name: string }[];
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(roleId);
  const [pendingRole, setPendingRole] = useState<{ id: string; name: string } | null>(null);

  function confirmChange() {
    if (!pendingRole) return;
    const newRoleId = pendingRole.id;
    setValue(newRoleId);
    setPendingRole(null);
    startTransition(async () => {
      const result = await changeMemberRoleAction(orgSlug, orgId, membershipId, newRoleId);
      if (result?.error) {
        toast.error(result.error);
        setValue(roleId);
      }
    });
  }

  return (
    <>
      <Select
        value={value}
        disabled={disabled || pending}
        onValueChange={(newRoleId) => {
          if (newRoleId === value) return;
          const role = roles.find((r) => r.id === newRoleId);
          if (role) setPendingRole({ id: newRoleId, name: role.name });
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

      <AlertDialog open={pendingRole !== null} onOpenChange={(open) => !open && setPendingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change {memberName}&apos;s role?</AlertDialogTitle>
            <AlertDialogDescription>
              {roleName} → {pendingRole?.name}. This changes what {memberName} can see and do in this organization
              immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange}>Change role</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
