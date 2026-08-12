"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/auth/submit-button";

export function AddExceptionForm({
  action,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const [isAvailable, setIsAvailable] = useState(false);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <DateField id="date" name="date" type="date" required className="w-40" />
      </div>
      <div className="mb-1.5 flex items-center gap-2">
        <Checkbox id="isAvailable" name="isAvailable" checked={isAvailable} onCheckedChange={(v) => setIsAvailable(!!v)} />
        <Label htmlFor="isAvailable" className="cursor-pointer font-normal">
          Extra available (unchecked = unavailable all day, unless time range given)
        </Label>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="startTime">Start (optional)</Label>
        <Input id="startTime" name="startTime" type="time" className="w-28" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="endTime">End (optional)</Label>
        <Input id="endTime" name="endTime" type="time" className="w-28" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reason">Reason</Label>
        <Input id="reason" name="reason" placeholder="Exam, travel, …" className="w-48" />
      </div>
      <SubmitButton>Add exception</SubmitButton>
      {state?.error ? <p className="w-full text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
