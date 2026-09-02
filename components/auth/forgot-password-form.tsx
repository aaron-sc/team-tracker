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

  if (state?.message) {
    return (
      <Alert>
        <AlertDescription className="space-y-2">
          <p>{state.message}</p>
          {state.devResetUrl ? (
            <>
              <p className="text-xs text-muted-foreground">
                No email provider is configured in this environment, so here&apos;s the link directly (dev only —
                this never happens in production):
              </p>
              <Link
                href={state.devResetUrl}
                className="block break-all font-medium text-primary underline underline-offset-4"
              >
                {typeof window !== "undefined" ? window.location.origin : ""}
                {state.devResetUrl}
              </Link>
            </>
          ) : null}
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
