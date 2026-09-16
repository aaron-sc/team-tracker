"use client";

import { useState, useTransition } from "react";
import { updateRosterFieldPermissionsAction } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SELF_EDITABLE_ROSTER_FIELDS, ROSTER_FIELD_LABELS, type SelfEditableRosterField } from "@/lib/constants/roster-fields";
import { Settings2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function RosterFieldPermissionsDialog({
  orgSlug,
  orgId,
  teamId,
  editableFields,
}: {
  orgSlug: string;
  orgId: string;
  teamId: string;
  editableFields: SelfEditableRosterField[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const editableSet = new Set(editableFields);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateRosterFieldPermissionsAction(orgSlug, orgId, teamId, undefined, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(result?.success ?? "Saved.");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="size-3.5" />
          Player edit permissions
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What can players edit themselves?</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Players can always edit their own bio and tracker links. Choose which of these you also want them
            to manage without a coach — anything left unchecked stays coach-only.
          </p>
          <div className="space-y-2">
            {SELF_EDITABLE_ROSTER_FIELDS.map((field) => (
              <div key={field} className="flex items-center gap-2">
                <Checkbox id={`field-${field}`} name={field} defaultChecked={editableSet.has(field)} />
                <Label htmlFor={`field-${field}`} className="cursor-pointer font-normal">
                  {ROSTER_FIELD_LABELS[field]}
                </Label>
              </div>
            ))}
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
