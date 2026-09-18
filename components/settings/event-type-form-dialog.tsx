"use client";

import { useState, useTransition } from "react";
import { createEventTypeAction, updateEventTypeAction } from "@/lib/actions/event-types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Loader2 } from "lucide-react";

export function EventTypeFormDialog({
  orgSlug,
  orgId,
  eventTypeId,
  defaultValues,
}: {
  orgSlug: string;
  orgId: string;
  eventTypeId?: string;
  defaultValues?: { name?: string; trackAttendance?: boolean };
}) {
  const isEdit = !!eventTypeId;
  const [open, setOpen] = useState(false);
  const [trackAttendance, setTrackAttendance] = useState(defaultValues?.trackAttendance ?? true);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = isEdit
        ? await updateEventTypeAction(orgSlug, orgId, eventTypeId, undefined, formData)
        : await createEventTypeAction(orgSlug, orgId, undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        toast.success(result?.success ?? "Saved.");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(undefined);
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon-sm">
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" />
            Add event type
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit event type" : "Add event type"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={defaultValues?.name} placeholder="Community Event" required maxLength={60} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="trackAttendance"
              name="trackAttendance"
              checked={trackAttendance}
              onCheckedChange={(v) => setTrackAttendance(!!v)}
            />
            <Label htmlFor="trackAttendance" className="cursor-pointer font-normal">
              Track attendance/RSVPs for this kind of event
            </Label>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEdit ? "Save" : "Add event type"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
