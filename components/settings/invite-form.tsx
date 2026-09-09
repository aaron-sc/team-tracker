"use client";

import { useActionState } from "react";
import { createInviteAction } from "@/lib/actions/members";
import type { ActionState } from "@/lib/actions/types";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";

export function InviteForm({
  orgSlug,
  orgId,
  roles,
}: {
  orgSlug: string;
  orgId: string;
  roles: { id: string; name: string }[];
}) {
  const action = createInviteAction.bind(null, orgSlug, orgId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="invite-emails">Email(s)</Label>
        <Textarea
          id="invite-emails"
          name="emails"
          placeholder={"player@example.com\ncoach@example.com"}
          required
          rows={1}
          className="w-64 resize-y"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="invite-role">Role</Label>
        <Select name="roleId" defaultValue={roles[0]?.id}>
          <SelectTrigger id="invite-role" className="w-40">
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
      </div>
      <SubmitButton>Send invite(s)</SubmitButton>
      <p className="w-full text-xs text-muted-foreground">Separate multiple addresses with a comma or a new line.</p>
      {state?.error ? <p className="w-full text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="w-full text-sm text-emerald-600">{state.success}</p> : null}
    </form>
  );
}
