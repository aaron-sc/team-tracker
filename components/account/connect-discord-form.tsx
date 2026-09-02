"use client";

import { useActionState, useTransition } from "react";
import { redeemDiscordLinkCodeAction, disconnectDiscordAction } from "@/lib/actions/discord-bot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot } from "lucide-react";
import { toast } from "sonner";

export function ConnectDiscordForm({ discordUserId, discordHandle }: { discordUserId: string | null; discordHandle: string | null }) {
  const [state, formAction, pending] = useActionState(redeemDiscordLinkCodeAction, undefined);
  const [disconnectPending, startDisconnect] = useTransition();

  if (discordUserId) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm">
          <Bot className="size-4 text-muted-foreground" />
          Connected as <span className="font-medium">{discordHandle}</span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disconnectPending}
          onClick={() =>
            startDisconnect(async () => {
              await disconnectDiscordAction();
              toast.success("Disconnected.");
            })
          }
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Run <code className="rounded bg-muted px-1 py-0.5 text-xs">/link</code> in a Discord server that has the
        Formation bot, then paste the code it gives you.
      </p>
      <div className="flex items-center gap-2">
        <Input name="code" placeholder="ABC123" maxLength={6} className="max-w-32 font-mono uppercase" required />
        <Button type="submit" size="sm" disabled={pending}>
          Connect
        </Button>
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.success}</p> : null}
    </form>
  );
}
