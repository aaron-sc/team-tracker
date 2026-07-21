"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/auth/submit-button";
import { PermissionChecklist } from "@/components/settings/permission-checklist";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import type { Permission } from "@/lib/generated/prisma/enums";

export function RoleForm({
  action,
  defaultValues,
  isOwnerRole = false,
  nameLocked = false,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: { name?: string; description?: string; color?: string; permissions?: Permission[] };
  isOwnerRole?: boolean;
  nameLocked?: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid max-w-md gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Role name</Label>
          <Input id="name" name="name" defaultValue={defaultValues?.name} disabled={nameLocked} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" defaultValue={defaultValues?.description} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="color">Badge color</Label>
          <Input id="color" name="color" type="color" defaultValue={defaultValues?.color ?? "#6366f1"} className="h-9 w-16 p-1" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Permissions</h3>
        {isOwnerRole ? (
          <p className="text-sm text-muted-foreground">
            The Owner role always has every permission and can&apos;t be restricted.
          </p>
        ) : (
          <PermissionChecklist defaultPermissions={defaultValues?.permissions} />
        )}
        {isOwnerRole
          ? ALL_PERMISSIONS.map((p) => <input key={p} type="hidden" name="permissions" value={p} />)
          : null}
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton>Save role</SubmitButton>
    </form>
  );
}
