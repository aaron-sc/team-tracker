"use client";

import { signOutEverywhereAction } from "@/lib/actions/account-security";
import { SubmitButton } from "@/components/auth/submit-button";
import { LogOut } from "lucide-react";

export function SignOutEverywhereButton() {
  return (
    <form
      action={signOutEverywhereAction}
      onSubmit={(e) => {
        if (!confirm("Sign out of every device and app, including this one?")) e.preventDefault();
      }}
    >
      <SubmitButton variant="outline">
        <LogOut className="size-4" />
        Sign out everywhere
      </SubmitButton>
    </form>
  );
}
