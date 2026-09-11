"use client";

import { useActionState } from "react";
import { verifyTwoFactorAction, type ActionState } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";

export function TwoFactorForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(verifyTwoFactorAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor="code">Code</Label>
        <Input
          id="code"
          name="code"
          inputMode="text"
          autoComplete="one-time-code"
          placeholder="123456 or a recovery code"
          autoFocus
          required
        />
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton className="w-full">Continue</SubmitButton>
    </form>
  );
}
