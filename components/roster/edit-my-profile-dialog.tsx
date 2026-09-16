"use client";

import { useState, useTransition } from "react";
import { updateRosterEntryAction } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RankSelect } from "@/components/ui/rank-select";
import { ROSTER_FIELD_LABELS, type SelfEditableRosterField } from "@/lib/constants/roster-fields";
import { Pencil, Loader2 } from "lucide-react";

/** Self-service editor for a player's own entry on one of their teams. Bio and tracker links are
 *  always editable; jerseyNumber/position/inGameName/rank only appear when the team has opted
 *  them in (see the coach-facing RosterFieldPermissionsDialog and Team.playerEditableFields) —
 *  isStarter stays coach-only always, so it never appears here. */
export function EditMyProfileDialog({
  orgSlug,
  orgId,
  teamMembershipId,
  teamName,
  game,
  editableFields,
  defaultValues,
}: {
  orgSlug: string;
  orgId: string;
  teamMembershipId: string;
  teamName: string;
  /** The team's game — picks which rank ladder RankSelect offers. */
  game: string;
  editableFields: SelfEditableRosterField[];
  defaultValues: {
    position: string;
    jerseyNumber: string;
    inGameName: string;
    rank: string;
    bio: string;
    trackerLink: string;
    trackerValorant: string;
    trackerRocketLeague: string;
    trackerSmash: string;
    trackerLeagueOfLegends: string;
  };
}) {
  const editable = new Set(editableFields);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateRosterEntryAction(orgSlug, orgId, teamMembershipId, undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="size-3.5" />
          Edit profile
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{teamName} — edit profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {editable.has("inGameName") ? (
            <div className="space-y-1.5">
              <Label htmlFor="my-inGameName">{ROSTER_FIELD_LABELS.inGameName}</Label>
              <Input id="my-inGameName" name="inGameName" defaultValue={defaultValues.inGameName} />
            </div>
          ) : null}
          {editable.has("position") ? (
            <div className="space-y-1.5">
              <Label htmlFor="my-position">{ROSTER_FIELD_LABELS.position}</Label>
              <Input id="my-position" name="position" defaultValue={defaultValues.position} />
            </div>
          ) : null}
          {editable.has("jerseyNumber") ? (
            <div className="space-y-1.5">
              <Label htmlFor="my-jerseyNumber">{ROSTER_FIELD_LABELS.jerseyNumber}</Label>
              <Input id="my-jerseyNumber" name="jerseyNumber" defaultValue={defaultValues.jerseyNumber} className="w-20" />
            </div>
          ) : null}
          {editable.has("rank") ? (
            <div className="space-y-1.5">
              <Label htmlFor="my-rank">{ROSTER_FIELD_LABELS.rank}</Label>
              <RankSelect id="my-rank" game={game} defaultValue={defaultValues.rank} />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="my-bio">Bio</Label>
            <Textarea id="my-bio" name="bio" rows={3} defaultValue={defaultValues.bio} maxLength={1000} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="my-trackerValorant">Valorant tracker</Label>
              <Input
                id="my-trackerValorant"
                name="trackerValorant"
                type="url"
                placeholder="https://tracker.gg/valorant/…"
                defaultValue={defaultValues.trackerValorant}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="my-trackerLeagueOfLegends">League of Legends tracker</Label>
              <Input
                id="my-trackerLeagueOfLegends"
                name="trackerLeagueOfLegends"
                type="url"
                placeholder="https://op.gg/…"
                defaultValue={defaultValues.trackerLeagueOfLegends}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="my-trackerRocketLeague">Rocket League tracker</Label>
              <Input
                id="my-trackerRocketLeague"
                name="trackerRocketLeague"
                type="url"
                placeholder="https://tracker.gg/rocket-league/…"
                defaultValue={defaultValues.trackerRocketLeague}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="my-trackerSmash">Smash Bros tracker</Label>
              <Input
                id="my-trackerSmash"
                name="trackerSmash"
                type="url"
                placeholder="https://start.gg/…"
                defaultValue={defaultValues.trackerSmash}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="my-trackerLink">Other tracker link</Label>
            <Input
              id="my-trackerLink"
              name="trackerLink"
              type="url"
              placeholder="https://…"
              defaultValue={defaultValues.trackerLink}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
