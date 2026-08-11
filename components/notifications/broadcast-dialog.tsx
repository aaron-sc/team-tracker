"use client";

import { useActionState, useState } from "react";
import { sendBroadcastNotificationAction } from "@/lib/actions/notifications";
import type { ActionState } from "@/lib/actions/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { BellPlus } from "lucide-react";

export function BroadcastDialog({
  orgSlug,
  orgId,
  teams,
}: {
  orgSlug: string;
  orgId: string;
  teams: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const action = sendBroadcastNotificationAction.bind(null, orgSlug, orgId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);

  // Close the dialog once the action reports success. Comparing against the
  // previously-seen state (updated in the same render) avoids doing this in
  // an effect while still only firing once per successful submission.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.success) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <BellPlus className="size-4" />
          Notify members
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a notification</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Details (optional)</Label>
            <Textarea id="body" name="body" rows={3} maxLength={500} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="teamId">Audience</Label>
            <Select name="teamId" defaultValue="all">
              <SelectTrigger id="teamId" className="w-full">
                <SelectValue placeholder="Everyone in the org" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone in the org</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} only
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state?.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}
          <SubmitButton>Send</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
