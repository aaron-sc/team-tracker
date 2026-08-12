"use client";

import { useActionState, useEffect, useState } from "react";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/auth/submit-button";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RuleGroupForm({
  action,
  defaultTimezone,
  defaultDays = [],
  defaultStartTime = "18:00",
  defaultEndTime = "21:00",
  submitLabel = "Add",
  onSaved,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultTimezone: string;
  defaultDays?: number[];
  defaultStartTime?: string;
  defaultEndTime?: string;
  submitLabel?: string;
  onSaved?: () => void;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const [days, setDays] = useState<number[]>(defaultDays);

  useEffect(() => {
    if (state?.success) onSaved?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Days</Label>
        <div className="flex flex-wrap gap-3">
          {DAY_LABELS.map((label, i) => (
            <label key={i} className="flex items-center gap-1.5 text-sm">
              <Checkbox
                name="daysOfWeek"
                value={String(i)}
                checked={days.includes(i)}
                onCheckedChange={(checked) => {
                  setDays((prev) => (checked ? [...prev, i].sort((a, b) => a - b) : prev.filter((d) => d !== i)));
                }}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="startTime">Start</Label>
          <Input id="startTime" name="startTime" type="time" className="w-28" required defaultValue={defaultStartTime} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endTime">End</Label>
          <Input id="endTime" name="endTime" type="time" className="w-28" required defaultValue={defaultEndTime} />
        </div>
        <input type="hidden" name="timezone" value={defaultTimezone} />
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
