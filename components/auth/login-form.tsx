"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type ActionState } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/auth/submit-button";

export function LoginForm({
  defaultEmail,
  redirectTo,
}: {
  defaultEmail?: string;
  redirectTo?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(loginAction, undefined);

  return (
    <div className="space-y-4">
      <Button variant="outline" className="w-full" asChild>
        <Link href={`/sso${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}>
          Continue with esports-tools.com
        </Link>
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or</span>
        </div>
      </div>
      <form action={formAction} className="space-y-4">
        {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={defaultEmail}
            readOnly={!!defaultEmail}
            required
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground underline underline-offset-4">
              Forgot password?
            </Link>
          </div>
          <PasswordInput id="password" name="password" autoComplete="current-password" required />
        </div>
        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <SubmitButton className="w-full">Log in</SubmitButton>
      </form>
    </div>
  );
}
