"use client";

import { useActionState } from "react";
import { acceptTeamInviteLinkAction, type ActionState } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/auth/submit-button";

export function JoinTeamButton({ token, teamName }: { token: string; teamName: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(acceptTeamInviteLinkAction, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton className="w-full">Join {teamName}</SubmitButton>
    </form>
  );
}
