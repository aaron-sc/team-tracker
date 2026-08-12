"use client";

import { useTransition } from "react";
import { resendVerificationEmailAction } from "@/lib/actions/email-verification";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

export function ResendVerificationButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await resendVerificationEmailAction();
          if (result?.error) toast.error(result.error);
          else toast.success(result?.success ?? "Sent.");
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
      Resend verification email
    </Button>
  );
}
