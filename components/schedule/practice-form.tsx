"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { SuggestedTimesPanel } from "@/components/schedule/suggested-times-panel";

export function PracticeForm({
  action,
  teams,
  opponents,
  venues,
  defaultValues,
  lockTeam = false,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  teams: { id: string; name: string }[];
  opponents: { id: string; name: string }[];
  venues: { id: string; name: string }[];
  /** Also controls whether the "repeat weekly" option shows — only offered when creating, not editing. */
  lockTeam?: boolean;
  defaultValues?: {
    teamId?: string;
    type?: string;
    opponentId?: string;
    scheduledAt?: string;
    durationMinutes?: number;
    locationType?: string;
    venueId?: string;
    notes?: string;
  };
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const [teamId, setTeamId] = useState(defaultValues?.teamId ?? teams[0]?.id ?? "");
  const [type, setType] = useState(defaultValues?.type ?? "PRACTICE");
  const [locationType, setLocationType] = useState(defaultValues?.locationType ?? "ONLINE");
  const [useNewOpponent, setUseNewOpponent] = useState(opponents.length === 0);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="teamId">Team</Label>
          <Select name="teamId" value={teamId} onValueChange={setTeamId} disabled={lockTeam}>
            <SelectTrigger id="teamId" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="type">Type</Label>
          <Select name="type" value={type} onValueChange={setType}>
            <SelectTrigger id="type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRACTICE">Internal practice</SelectItem>
              <SelectItem value="SCRIM">Scrim (vs opponent)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {type === "SCRIM" ? (
        <div className="space-y-1.5">
          <Label>Opponent</Label>
          {!useNewOpponent ? (
            <div className="flex items-center gap-2">
              <Select name="opponentId" defaultValue={defaultValues?.opponentId ?? opponents[0]?.id}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {opponents.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                className="whitespace-nowrap text-sm text-muted-foreground underline underline-offset-4"
                onClick={() => setUseNewOpponent(true)}
              >
                New opponent
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input name="newOpponentName" placeholder="Opponent org name" />
              {opponents.length > 0 ? (
                <button
                  type="button"
                  className="whitespace-nowrap text-sm text-muted-foreground underline underline-offset-4"
                  onClick={() => setUseNewOpponent(false)}
                >
                  Choose existing
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {teamId ? <SuggestedTimesPanel key={teamId} teamId={teamId} scheduledAtInputId="scheduledAt" /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="scheduledAt">Date &amp; time</Label>
          <DateField id="scheduledAt" name="scheduledAt" type="datetime-local" defaultValue={defaultValues?.scheduledAt} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="durationMinutes">Duration (minutes)</Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={15}
            step={15}
            defaultValue={defaultValues?.durationMinutes ?? 60}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="locationType">Location</Label>
          <Select name="locationType" value={locationType} onValueChange={setLocationType}>
            <SelectTrigger id="locationType" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ONLINE">Online</SelectItem>
              <SelectItem value="LAN">LAN / In person</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {locationType === "LAN" ? (
          <div className="space-y-1.5">
            <Label htmlFor="venueId">Venue</Label>
            <Select name="venueId" defaultValue={defaultValues?.venueId}>
              <SelectTrigger id="venueId" className="w-full">
                <SelectValue placeholder="Choose a venue" />
              </SelectTrigger>
              <SelectContent>
                {venues.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={defaultValues?.notes} />
      </div>

      {!lockTeam ? (
        <div className="space-y-1.5">
          <Label htmlFor="repeatWeeks">Repeat</Label>
          <Select name="repeatWeeks" defaultValue="1">
            <SelectTrigger id="repeatWeeks" className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Just this once</SelectItem>
              <SelectItem value="4">Weekly for 4 weeks</SelectItem>
              <SelectItem value="8">Weekly for 8 weeks</SelectItem>
              <SelectItem value="12">Weekly for 12 weeks</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Creates separate sessions on the same day/time each week — each can be edited or cancelled individually.
          </p>
        </div>
      ) : null}

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton>Save session</SubmitButton>
    </form>
  );
}
