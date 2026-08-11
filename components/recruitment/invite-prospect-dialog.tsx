"use client";

import { useActionState, useState } from "react";
import { createInviteAction } from "@/lib/actions/members";
import type { ActionState } from "@/lib/actions/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { UserPlus } from "lucide-react";

export function InviteProspectDialog({
  orgSlug,
  orgId,
  prospectName,
  prospectEmail,
  roles,
}: {
  orgSlug: string;
  orgId: string;
  prospectName: string;
  prospectEmail: string;
  roles: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const action = createInviteAction.bind(null, orgSlug, orgId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.success) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="size-4" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite {prospectName}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="prospect-invite-email">Email</Label>
            <Input id="prospect-invite-email" name="email" type="email" value={prospectEmail} readOnly />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prospect-invite-role">Role</Label>
            <Select name="roleId" defaultValue={roles[0]?.id}>
              <SelectTrigger id="prospect-invite-role" className="w-full">
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
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state?.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}
          <SubmitButton>Send invite</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
