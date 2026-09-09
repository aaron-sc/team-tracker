"use client";

import { useActionState, useState } from "react";
import { createScrimRequestAction } from "@/lib/actions/scrims";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/auth/submit-button";
import { Handshake } from "lucide-react";

export function ScrimRequestDialog({
  orgSlug,
  orgId,
  listingId,
  listingLabel,
  teams,
}: {
  orgSlug: string;
  orgId: string;
  listingId: string;
  listingLabel: string;
  teams: { id: string; name: string; game: string }[];
}) {
  const [open, setOpen] = useState(false);
  const action = createScrimRequestAction.bind(null, orgSlug, orgId, listingId);
  const [state, formAction] = useActionState(action, undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Handshake className="size-4" />
          Request to scrim
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a scrim</DialogTitle>
          <DialogDescription>Requesting against {listingLabel}. They&apos;ll see your team name and message before accepting.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="requestingTeamId">Which of your teams?</Label>
            <Select name="requestingTeamId" defaultValue={teams[0]?.id}>
              <SelectTrigger id="requestingTeamId" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.game})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea id="message" name="message" rows={3} placeholder="We're free at that time, ready when you are." maxLength={1000} />
          </div>
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <SubmitButton className="w-full">Send request</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
