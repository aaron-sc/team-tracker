"use client";

import { useState, useTransition } from "react";
import { updateRosterEntryAction } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Loader2 } from "lucide-react";

export function EditRosterEntryDialog({
  orgSlug,
  orgId,
  teamMembershipId,
  playerName,
  defaultValues,
}: {
  orgSlug: string;
  orgId: string;
  teamMembershipId: string;
  playerName: string;
  defaultValues: { position: string; jerseyNumber: string; inGameName: string; isStarter: boolean };
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
        <Button variant="ghost" size="icon-sm">
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {playerName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-position">Position</Label>
            <Input id="edit-position" name="position" defaultValue={defaultValues.position} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-inGameName">In-game name</Label>
            <Input id="edit-inGameName" name="inGameName" defaultValue={defaultValues.inGameName} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-jerseyNumber">Jersey #</Label>
            <Input id="edit-jerseyNumber" name="jerseyNumber" defaultValue={defaultValues.jerseyNumber} className="w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="edit-isStarter" name="isStarter" defaultChecked={defaultValues.isStarter} />
            <Label htmlFor="edit-isStarter" className="cursor-pointer font-normal">
              Starter
            </Label>
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
