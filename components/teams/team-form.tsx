"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";

export function TeamForm({
  action,
  defaultValues,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: { name?: string; game?: string; logoUrl?: string };
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Team name</Label>
        <Input id="name" name="name" placeholder="Nova Valorant" defaultValue={defaultValues?.name} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="game">Game</Label>
        <Input id="game" name="game" placeholder="Valorant" defaultValue={defaultValues?.game} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="logoUrl">Logo URL (optional)</Label>
        <Input id="logoUrl" name="logoUrl" type="url" placeholder="https://…" defaultValue={defaultValues?.logoUrl} />
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton>Save team</SubmitButton>
    </form>
  );
}
