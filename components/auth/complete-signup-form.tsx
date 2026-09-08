"use client";

import { useActionState } from "react";
import { signupAction, type ActionState } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";

/** Shown at /signup?token=… once an access request has been approved. The email is fixed by the
 *  approved request (server-side) and only displayed here. */
export function CompleteSignupForm({
  token,
  email,
  defaultName,
  defaultOrgName,
}: {
  token: string;
  email: string;
  defaultName: string;
  defaultOrgName: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(signupAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} readOnly />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="orgName">Organization name</Label>
        <Input id="orgName" name="orgName" defaultValue={defaultOrgName} placeholder="Nova Esports" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" autoComplete="name" defaultValue={defaultName} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton className="w-full">Create organization</SubmitButton>
    </form>
  );
}
