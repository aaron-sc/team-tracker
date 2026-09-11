"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeOAuthGrantAction } from "@/lib/actions/account-security";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function RevokeConnectedAppButton({ clientDbId, appName }: { clientDbId: string; appName: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Revoke ${appName}'s access? You'll be asked to approve it again next time you sign in there.`)) {
          return;
        }
        startTransition(async () => {
          await revokeOAuthGrantAction(clientDbId);
          toast.success(`Revoked ${appName}.`);
          router.refresh();
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Revoke
    </Button>
  );
}
