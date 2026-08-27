"use client";

import { useActionState, useTransition } from "react";
import { updateTeamDiscordSettingsAction, testTeamDiscordWebhookAction } from "@/lib/actions/team-discord";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { REMINDER_MINUTES_OPTIONS } from "@/lib/utils/reminder-options";

function ReminderSelect({ id, name, defaultMinutes }: { id: string; name: string; defaultMinutes: number | null }) {
  const value = defaultMinutes ? String(defaultMinutes) : "off";
  return (
    // Keyed by the saved value so a successful save (which brings a fresh `defaultMinutes`
    // prop via revalidatePath) remounts this uncontrolled Select instead of silently keeping
    // whatever it showed at initial mount — otherwise the dropdown appears stuck until a
    // full page reload.
    <Select key={value} name={name} defaultValue={value}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {REMINDER_MINUTES_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TeamDiscordPanel({
  orgSlug,
  orgId,
  teamId,
  webhookUrl,
  mentionRoleId,
  matchReminderMinutes,
  practiceReminderMinutes,
  scrimReminderMinutes,
}: {
  orgSlug: string;
  orgId: string;
  teamId: string;
  webhookUrl: string | null;
  mentionRoleId: string | null;
  matchReminderMinutes: number | null;
  practiceReminderMinutes: number | null;
  scrimReminderMinutes: number | null;
}) {
  const action = updateTeamDiscordSettingsAction.bind(null, orgSlug, orgId, teamId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const [testing, startTest] = useTransition();

  return (
    <div className="space-y-3">
      <form action={formAction} className="max-w-xl space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="webhookUrl">Webhook URL</Label>
          <Input
            key={webhookUrl ?? ""}
            id="webhookUrl"
            name="webhookUrl"
            placeholder="https://discord.com/api/webhooks/..."
            defaultValue={webhookUrl ?? ""}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            In Discord: Server Settings → Integrations → Webhooks → New Webhook, then copy the URL and point it at
            this team&apos;s channel. Team-scoped announcements post here instead of the org channel. Leave blank to
            disconnect.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mentionRoleId">Mention role ID</Label>
          <Input
            key={mentionRoleId ?? ""}
            id="mentionRoleId"
            name="mentionRoleId"
            placeholder="123456789012345678"
            defaultValue={mentionRoleId ?? ""}
            className="max-w-xs font-mono text-sm"
            inputMode="numeric"
          />
          <p className="text-xs text-muted-foreground">
            Optional — pings this Discord role on every reminder, team announcement, and match result posted here.
            In Discord: enable Developer Mode (Settings → Advanced), then right-click the role in Server Settings →
            Roles and Copy Role ID. Leave blank to post without a ping.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="matchReminderMinutes">Match reminders</Label>
            <ReminderSelect id="matchReminderMinutes" name="matchReminderMinutes" defaultMinutes={matchReminderMinutes} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="practiceReminderMinutes">Practice reminders</Label>
            <ReminderSelect
              id="practiceReminderMinutes"
              name="practiceReminderMinutes"
              defaultMinutes={practiceReminderMinutes}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scrimReminderMinutes">Scrim reminders</Label>
            <ReminderSelect id="scrimReminderMinutes" name="scrimReminderMinutes" defaultMinutes={scrimReminderMinutes} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Reminders only send if a webhook URL is set above. Rescheduling an event resets its reminder.
        </p>

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
                  const result = await testTeamDiscordWebhookAction(orgId, teamId);
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
