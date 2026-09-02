"use client";

import { useState, useTransition } from "react";
import { createGearItemAction, updateGearItemAction } from "@/lib/actions/gear";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Loader2 } from "lucide-react";

const STATUSES = [
  { value: "AVAILABLE", label: "Available" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "MAINTENANCE", label: "In maintenance" },
  { value: "LOST", label: "Lost" },
  { value: "RETIRED", label: "Retired" },
] as const;

type Member = { id: string; name: string };
type Team = { id: string; name: string };

export function GearItemDialog({
  orgSlug,
  orgId,
  members,
  teams,
  item,
}: {
  orgSlug: string;
  orgId: string;
  members: Member[];
  teams: Team[];
  item?: {
    id: string;
    name: string;
    category: string | null;
    serialNumber: string | null;
    status: string;
    assignedToMembershipId: string | null;
    assignedToTeamId: string | null;
    notes: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const action = item ? updateGearItemAction(orgSlug, orgId, item.id, undefined, formData) : createGearItemAction(orgSlug, orgId, undefined, formData);
      const result = await action;
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
        {item ? (
          <Button variant="ghost" size="icon-sm">
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" />
            Add gear
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit gear item" : "Add gear item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={item?.name} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" defaultValue={item?.category ?? ""} placeholder="Peripheral, jersey…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="serialNumber">Serial #</Label>
              <Input id="serialNumber" name="serialNumber" defaultValue={item?.serialNumber ?? ""} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={item?.status ?? "AVAILABLE"}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="assignedToMembershipId">Assigned to</Label>
              <Select name="assignedToMembershipId" defaultValue={item?.assignedToMembershipId ?? "none"}>
                <SelectTrigger id="assignedToMembershipId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nobody</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assignedToTeamId">Or team</Label>
              <Select name="assignedToTeamId" defaultValue={item?.assignedToTeamId ?? "none"}>
                <SelectTrigger id="assignedToTeamId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={item?.notes ?? ""} rows={2} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {item ? "Save changes" : "Add gear item"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
