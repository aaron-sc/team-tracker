"use client";

import { useActionState, useTransition } from "react";
import { saveDiscordWebhookAction, testDiscordWebhookAction } from "@/lib/actions/integrations";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send } from "lucide-react";

export function DiscordPanel({
  orgSlug,
  orgId,
  webhookUrl,
}: {
  orgSlug: string;
  orgId: string;
  webhookUrl: string | null;
}) {
  const action = saveDiscordWebhookAction.bind(null, orgSlug, orgId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const [testing, startTest] = useTransition();

  return (
    <div className="space-y-3">
      <form action={formAction} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="webhookUrl">Webhook URL</Label>
          <Input
            id="webhookUrl"
            name="webhookUrl"
            placeholder="https://discord.com/api/webhooks/..."
            defaultValue={webhookUrl ?? ""}
            className="max-w-md font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            In Discord: Server Settings → Integrations → Webhooks → New Webhook, then copy the URL. Leave blank and
            save to disconnect.
          </p>
        </div>
        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        {state?.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}
        <div className="flex gap-2">
          <SubmitButton>Save</SubmitButton>
          {webhookUrl ? (
            <Button
              type="button"
              variant="outline"
              disabled={testing}
              onClick={() => {
                startTest(async () => {
                  const result = await testDiscordWebhookAction(orgId);
                  if (result?.error) toast.error(result.error);
                  else toast.success(result?.success ?? "Sent.");
                });
              }}
            >
              <Send className="size-4" />
              Send test message
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
