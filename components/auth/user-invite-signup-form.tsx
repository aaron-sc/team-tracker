"use client";

import { useActionState } from "react";
import { userInviteSignupAction, type ActionState } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";

/** Shown at /signup?invite=… — unlike CompleteSignupForm (an approved AccessRequest, email fixed
 *  server-side), there's no pre-submitted request here, so the invitee picks their own email. */
export function UserInviteSignupForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(userInviteSignupAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" autoComplete="name" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="orgName">Organization name</Label>
        <Input id="orgName" name="orgName" placeholder="Nova Esports" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} />
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton className="w-full">Create organization</SubmitButton>
    </form>
  );
}
