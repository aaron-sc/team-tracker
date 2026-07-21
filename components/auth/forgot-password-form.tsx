"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type RequestResetState } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<RequestResetState, FormData>(requestPasswordResetAction, undefined);

  if (state?.resetUrl) {
    return (
      <Alert>
        <AlertDescription className="space-y-2">
          <p>
            No email is configured yet, so here&apos;s your reset link directly (this would normally be emailed):
          </p>
          <Link href={state.resetUrl} className="block break-all font-medium text-primary underline underline-offset-4">
            {typeof window !== "undefined" ? window.location.origin : ""}
            {state.resetUrl}
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton className="w-full">Send reset link</SubmitButton>
    </form>
  );
}
