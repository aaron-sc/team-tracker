"use client";

import { useState, useTransition } from "react";
import { createPlayerActionAction } from "@/lib/actions/player-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";

export function PlayerActionDialog({
  orgSlug,
  orgId,
  teamMembershipId,
  membershipId,
  teamName,
}: {
  orgSlug: string;
  orgId: string;
  teamMembershipId: string;
  membershipId: string;
  teamName: string;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"BENCHED" | "DISCIPLINARY">("BENCHED");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createPlayerActionAction(orgSlug, orgId, teamMembershipId, membershipId, undefined, formData);
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
          <Plus className="size-3.5" />
          Record action
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record action — {teamName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pa-type">Type</Label>
            <Select name="type" value={type} onValueChange={(v) => setType(v as "BENCHED" | "DISCIPLINARY")}>
              <SelectTrigger id="pa-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BENCHED">Benched</SelectItem>
                <SelectItem value="DISCIPLINARY">Disciplinary action</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pa-reason">Reason</Label>
            <Textarea id="pa-reason" name="reason" rows={3} required maxLength={2000} />
          </div>
          {type === "BENCHED" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pa-startDate">Start date</Label>
                <Input id="pa-startDate" name="startDate" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pa-endDate">End date (optional)</Label>
                <Input id="pa-endDate" name="endDate" type="date" />
              </div>
            </div>
          ) : null}
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
