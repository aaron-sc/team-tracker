"use client";

import { useTransition } from "react";
import { verifyEmailAction } from "@/lib/actions/email-verification";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ConfirmVerifyEmailButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await verifyEmailAction(token);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Verify my email
    </Button>
  );
}
