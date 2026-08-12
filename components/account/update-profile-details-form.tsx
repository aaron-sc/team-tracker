"use client";

import { useActionState } from "react";
import { updateProfileDetailsAction, type UpdateProfileDetailsState } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";

export function UpdateProfileDetailsForm({
  currentDiscordHandle,
  currentPhone,
}: {
  currentDiscordHandle: string;
  currentPhone: string;
}) {
  const [state, formAction] = useActionState<UpdateProfileDetailsState, FormData>(updateProfileDetailsAction, undefined);

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="discordHandle">Discord username</Label>
        <Input id="discordHandle" name="discordHandle" placeholder="username" defaultValue={currentDiscordHandle} maxLength={40} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" type="tel" placeholder="+1 555 555 5555" defaultValue={currentPhone} maxLength={30} />
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}
      <SubmitButton>Save details</SubmitButton>
    </form>
  );
}
