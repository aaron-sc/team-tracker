"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ActionState } from "@/lib/actions/types";

/** A single button that calls a non-redirecting scrim action (accept/decline/cancel/withdraw)
 *  and toasts on error — same pattern as RsvpQuickActions. */
export function ScrimQuickActionButton({
  action,
  children,
  variant = "outline",
  successMessage,
}: {
  action: () => Promise<ActionState>;
  children: React.ReactNode;
  variant?: "outline" | "default" | "destructive" | "ghost";
  successMessage?: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await action();
      if (result?.error) toast.error(result.error);
      else if (successMessage) toast.success(successMessage);
    });
  }

  return (
    <Button size="sm" variant={variant} disabled={pending} onClick={handleClick}>
      {children}
    </Button>
  );
}
