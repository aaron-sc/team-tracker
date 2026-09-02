"use client";

import { useState, useTransition } from "react";
import { updateRosterEntryAction } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Loader2 } from "lucide-react";

/** Self-service editor for a player's own bio + tracker links on one of their teams — a lighter
 *  version of the coach-facing EditRosterEntryDialog that can't touch jersey/position/starter. */
export function EditMyProfileDialog({
  orgSlug,
  orgId,
  teamMembershipId,
  teamName,
  defaultValues,
}: {
  orgSlug: string;
  orgId: string;
  teamMembershipId: string;
  teamName: string;
  defaultValues: {
    bio: string;
    trackerLink: string;
    trackerValorant: string;
    trackerRocketLeague: string;
    trackerSmash: string;
    trackerLeagueOfLegends: string;
  };
}) {
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
          Edit bio &amp; trackers
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{teamName} — bio &amp; trackers</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
