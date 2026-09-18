"use client";

import { useEffect, useState, useActionState, useTransition } from "react";
import {
  updateTeamDiscordSettingsAction,
  testTeamDiscordWebhookAction,
  testTeamDiscordReminderAction,
} from "@/lib/actions/team-discord";
import { getDiscordGuildOptionsAction } from "@/lib/actions/discord-bot";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { REMINDER_MINUTES_OPTIONS } from "@/lib/utils/reminder-options";

/** Any number of lead times can fire for the same event (e.g. 1 day before AND 1 hour before) —
 *  a checkbox group rather than the single-select this used to be. */
function ReminderCheckboxGroup({ idPrefix, name, defaultMinutes }: { idPrefix: string; name: string; defaultMinutes: number[] }) {
  const [checked, setChecked] = useState<Set<string>>(new Set(defaultMinutes.map(String)));
  return (
    <div className="space-y-1.5">
      {REMINDER_MINUTES_OPTIONS.map((o) => (
        <div key={o.value} className="flex items-center gap-2">
          <Checkbox
            id={`${idPrefix}-${o.value}`}
            name={name}
            value={o.value}
            checked={checked.has(o.value)}
            onCheckedChange={(v) => {
              setChecked((prev) => {
                const next = new Set(prev);
                if (v) next.add(o.value);
                else next.delete(o.value);
                return next;
              });
            }}
          />
          <Label htmlFor={`${idPrefix}-${o.value}`} className="cursor-pointer text-sm font-normal">
            {o.label}
          </Label>
        </div>
      ))}
    </div>
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
  notifyOnCreate,
  reminderChannelId,
  roleId,
  botConnected,
}: {
  orgSlug: string;
  orgId: string;
  teamId: string;
  webhookUrl: string | null;
  mentionRoleId: string | null;
  matchReminderMinutes: number[];
  practiceReminderMinutes: number[];
  scrimReminderMinutes: number[];
  notifyOnCreate: boolean;
  reminderChannelId: string | null;
  roleId: string | null;
  botConnected: boolean;
}) {
  const action = updateTeamDiscordSettingsAction.bind(null, orgSlug, orgId, teamId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const [testing, startTest] = useTransition();
  const [testingReminder, startReminderTest] = useTransition();
  const [guildChannels, setGuildChannels] = useState<{ id: string; name: string }[]>([]);
  const [guildRoles, setGuildRoles] = useState<{ id: string; name: string }[]>([]);
  const [notify, setNotify] = useState(notifyOnCreate);

  useEffect(() => {
    if (!botConnected) return;
    getDiscordGuildOptionsAction(orgId)
      .then((result) => {
        setGuildChannels(result.channels);
        setGuildRoles(result.roles);
      })
      .catch(() => {});
  }, [orgId, botConnected]);

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

        {botConnected ? (
          <div className="grid gap-4 sm:grid-cols-2 rounded-md border p-3">
            <div className="space-y-1.5">
              <Label htmlFor="reminderChannelId">Bot reminder channel</Label>
              <Select key={reminderChannelId ?? ""} name="reminderChannelId" defaultValue={reminderChannelId ?? "none"}>
                <SelectTrigger id="reminderChannelId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Off (webhook only)</SelectItem>
                  {guildChannels.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      #{c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Posts reminders here with interactive ✅/❌ RSVP buttons, in addition to the webhook above.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="roleId">Synced Discord role</Label>
              <Select key={roleId ?? ""} name="roleId" defaultValue={roleId ?? "none"}>
                <SelectTrigger id="roleId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {guildRoles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      @{r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Auto-assigned to a player&apos;s Discord account when they join this roster (needs Manage Roles, and
                the bot&apos;s own role positioned above this one).
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Match reminders</Label>
            <ReminderCheckboxGroup idPrefix="match" name="matchReminderMinutes" defaultMinutes={matchReminderMinutes} />
          </div>
          <div className="space-y-1.5">
            <Label>Practice reminders</Label>
            <ReminderCheckboxGroup
              idPrefix="practice"
              name="practiceReminderMinutes"
              defaultMinutes={practiceReminderMinutes}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Scrim reminders</Label>
            <ReminderCheckboxGroup idPrefix="scrim" name="scrimReminderMinutes" defaultMinutes={scrimReminderMinutes} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Check as many lead times as you want — e.g. both &quot;1 day before&quot; and &quot;1 hour before&quot; will
          each fire once. Reminders only send if a webhook URL is set above. Rescheduling an event resets them.
        </p>

        <div className="flex items-center gap-2">
          <Checkbox id="notifyOnCreate" name="notifyOnCreate" checked={notify} onCheckedChange={(v) => setNotify(!!v)} />
          <Label htmlFor="notifyOnCreate" className="cursor-pointer font-normal">
            Post to Discord immediately when a match/practice/scrim is scheduled
          </Label>
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
          {botConnected && reminderChannelId ? (
            <Button
              type="button"
              variant="outline"
              disabled={testingReminder}
              onClick={() => {
                startReminderTest(async () => {
                  const result = await testTeamDiscordReminderAction(orgId, teamId);
                  if (result?.error) toast.error(result.error);
                  else toast.success(result?.success ?? "Sent.");
                });
              }}
            >
              <Send className="size-4" />
              Send test reminder
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
