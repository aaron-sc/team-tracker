"use client";

import { useActionState } from "react";
import { disableTotpAction, type SecurityActionState } from "@/lib/actions/account-security";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";

export function DisableTwoFactorForm() {
  const [state, formAction] = useActionState<SecurityActionState, FormData>(disableTotpAction, undefined);

  if (state?.success) {
    return <p className="text-sm text-emerald-600">{state.success}</p>;
  }

  return (
    <form action={formAction} className="max-w-sm space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="disable-code">Confirm with a code to turn it off</Label>
        <Input id="disable-code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton variant="destructive">Disable two-factor authentication</SubmitButton>
    </form>
  );
}
