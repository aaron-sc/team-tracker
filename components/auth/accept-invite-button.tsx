"use client";

import { useActionState } from "react";
import { acceptInviteAsExistingUserAction, type ActionState } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/auth/submit-button";

export function AcceptInviteButton({ token, orgName }: { token: string; orgName: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(acceptInviteAsExistingUserAction, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton className="w-full">Accept & join {orgName}</SubmitButton>
    </form>
  );
}
