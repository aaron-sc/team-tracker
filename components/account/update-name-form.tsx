"use client";

import { useActionState } from "react";
import { updateNameAction, type UpdateNameState } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";

export function UpdateNameForm({ currentName }: { currentName: string }) {
  const [state, formAction] = useActionState<UpdateNameState, FormData>(updateNameAction, undefined);

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Display name</Label>
        <Input id="name" name="name" defaultValue={currentName} required minLength={2} maxLength={80} />
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}
      <SubmitButton>Save name</SubmitButton>
    </form>
  );
}
