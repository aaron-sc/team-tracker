"use client";

import { useActionState, useTransition } from "react";
import { redeemDiscordGuildLinkCodeAction, disconnectDiscordGuildAction } from "@/lib/actions/discord-bot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function DiscordBotPanel({
  orgSlug,
  orgId,
  inviteUrl,
  connectedGuildId,
}: {
  orgSlug: string;
  orgId: string;
  inviteUrl: string | null;
  connectedGuildId: string | null;
}) {
  const redeemAction = redeemDiscordGuildLinkCodeAction.bind(null, orgSlug, orgId);
  const [state, formAction, pending] = useActionState(redeemAction, undefined);
  const [disconnectPending, startDisconnect] = useTransition();

  if (!inviteUrl) {
    return (
      <p className="text-sm text-muted-foreground">
        Not configured for this deployment — an admin needs to set <code className="rounded bg-muted px-1 py-0.5 text-xs">DISCORD_BOT_TOKEN</code>{" "}
        and <code className="rounded bg-muted px-1 py-0.5 text-xs">DISCORD_CLIENT_ID</code>.
      </p>
    );
  }

  if (connectedGuildId) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm">
          <Bot className="size-4 text-muted-foreground" />
          Connected — <code className="text-xs text-muted-foreground">/available</code> and{" "}
          <code className="text-xs text-muted-foreground">/link</code> are live in your server.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disconnectPending}
          onClick={() => {
            if (!confirm("Disconnect the Discord bot from this org? Slash commands will stop working there.")) return;
            startDisconnect(async () => {
              await disconnectDiscordGuildAction(orgSlug, orgId);
              toast.success("Disconnected.");
            });
          }}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Add the bot, then run <code className="rounded bg-muted px-1 py-0.5 text-xs">/connect</code> in your server
        (requires Manage Server) and paste the code it gives you.
      </p>
      <Button variant="outline" size="sm" asChild>
        <a href={inviteUrl} target="_blank" rel="noreferrer">
          <ExternalLink className="size-4" />
          Add Formation to Discord
        </a>
      </Button>
      <form action={formAction} className="flex items-center gap-2">
        <Input name="code" placeholder="ABC123" maxLength={6} className="max-w-32 font-mono uppercase" required />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          Connect
        </Button>
      </form>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.success}</p> : null}
    </div>
  );
}
