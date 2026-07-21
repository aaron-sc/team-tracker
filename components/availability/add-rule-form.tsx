"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function AddRuleForm({
  action,
  defaultTimezone,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultTimezone: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="dayOfWeek">Day</Label>
        <Select name="dayOfWeek" defaultValue="1">
          <SelectTrigger id="dayOfWeek" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAYS.map((d, i) => (
              <SelectItem key={d} value={String(i)}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="startTime">Start</Label>
        <Input id="startTime" name="startTime" type="time" className="w-28" required defaultValue="18:00" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="endTime">End</Label>
        <Input id="endTime" name="endTime" type="time" className="w-28" required defaultValue="21:00" />
      </div>
      <input type="hidden" name="timezone" value={defaultTimezone} />
      <SubmitButton>Add</SubmitButton>
      {state?.error ? <p className="w-full text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
