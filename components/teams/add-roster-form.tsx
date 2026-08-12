"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";

export function AddRosterForm({
  action,
  candidates,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  candidates: { membershipId: string; name: string; roleName: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);

  if (candidates.length === 0) {
    return <p className="text-sm text-muted-foreground">Everyone in the organization is already on this team.</p>;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="membershipId">Member</Label>
        <Select name="membershipId" defaultValue={candidates[0]?.membershipId}>
          <SelectTrigger id="membershipId" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((c) => (
              <SelectItem key={c.membershipId} value={c.membershipId}>
                {c.name} ({c.roleName})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="position">Position</Label>
        <Input id="position" name="position" placeholder="Duelist, IGL, …" className="w-36" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="inGameName">In-game name</Label>
        <Input id="inGameName" name="inGameName" placeholder="PlayerTag#1234" className="w-36" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="jerseyNumber">Jersey #</Label>
        <Input id="jerseyNumber" name="jerseyNumber" className="w-20" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="trackerLink">Tracker link</Label>
        <Input id="trackerLink" name="trackerLink" type="url" placeholder="https://tracker.gg/valorant/…" className="w-56" />
      </div>
      <div className="mb-1.5 flex items-center gap-2">
        <Checkbox id="isStarter" name="isStarter" />
        <Label htmlFor="isStarter" className="cursor-pointer font-normal">
          Starter
        </Label>
      </div>
      <SubmitButton>Add to roster</SubmitButton>
      {state?.error ? <p className="w-full text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
