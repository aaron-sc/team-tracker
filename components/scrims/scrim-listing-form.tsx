"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RegionSelect } from "@/components/ui/region-select";
import { SubmitButton } from "@/components/auth/submit-button";
import { SuggestedTimesPanel } from "@/components/schedule/suggested-times-panel";
import { Megaphone, Gauge } from "lucide-react";

const FORMATS = ["BO1", "BO3", "BO5", "BO7", "OTHER"] as const;

export function ScrimListingForm({
  action,
  teams,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  teams: { id: string; name: string; game: string; averageRank: string | null }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [visibility, setVisibility] = useState("OPEN");
  const selectedTeam = teams.find((t) => t.id === teamId);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="teamId">Team</Label>
        <Select name="teamId" value={teamId} onValueChange={setTeamId}>
          <SelectTrigger id="teamId" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} ({t.game})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="region">Region</Label>
          <RegionSelect id="region" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="skillTier">Skill tier</Label>
          <Input id="skillTier" name="skillTier" placeholder="Immortal+" maxLength={60} />
          {selectedTeam?.averageRank ? (
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-primary underline underline-offset-4"
              onClick={() => {
                const input = document.getElementById("skillTier") as HTMLInputElement | null;
                if (!input || !selectedTeam.averageRank) return;
                input.value = selectedTeam.averageRank;
                input.dispatchEvent(new Event("input", { bubbles: true }));
              }}
            >
              <Gauge className="size-3" />
              Use team&apos;s average rank ({selectedTeam.averageRank})
            </button>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="format">Format</Label>
          <Select name="format" defaultValue="BO1">
            <SelectTrigger id="format" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMATS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {teamId ? <SuggestedTimesPanel key={teamId} teamId={teamId} scheduledAtInputId="proposedStart" /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="proposedStart">Proposed date &amp; time</Label>
          <DateField id="proposedStart" name="proposedStart" type="datetime-local" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="durationMinutes">Duration (minutes)</Label>
          <Input id="durationMinutes" name="durationMinutes" type="number" min={15} step={15} defaultValue={60} required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} placeholder="Looking for a 5-stack scrim, IGL preferred." maxLength={2000} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="visibility">Who can see this</Label>
        <Select name="visibility" value={visibility} onValueChange={setVisibility}>
          <SelectTrigger id="visibility" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">Any organization on Formation</SelectItem>
            <SelectItem value="PARTNERS_ONLY">Only orgs you&apos;ve already scrimmed via Formation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Megaphone className="mt-0.5 size-3.5 shrink-0" />
        <span>
          {visibility === "OPEN"
            ? "This listing — team name, game, region, tier, and your proposed time — becomes visible to every organization on Formation until it's matched or cancelled. No roster or contact details are shared unless you've separately enabled a public roster embed for this team."
            : "This listing is only visible to organizations you've already completed a matched scrim with via Formation."}
        </span>
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton>Post listing</SubmitButton>
    </form>
  );
}
