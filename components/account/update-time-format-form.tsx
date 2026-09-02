"use client";

import { useActionState, useState } from "react";
import { updateTimeFormatAction, type UpdateTimeFormatState } from "@/lib/actions/auth";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";

export function UpdateTimeFormatForm({ currentTimeFormat }: { currentTimeFormat: "12h" | "24h" }) {
  const [state, formAction] = useActionState<UpdateTimeFormatState, FormData>(updateTimeFormatAction, undefined);
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">(currentTimeFormat);

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="timeFormat">Time format</Label>
        <Select name="timeFormat" value={timeFormat} onValueChange={(v) => setTimeFormat(v as "12h" | "24h")}>
          <SelectTrigger id="timeFormat" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12h">12-hour (6:00 PM)</SelectItem>
            <SelectItem value="24h">24-hour (18:00)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Applies everywhere a time is shown to you across the app.
        </p>
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}
      <SubmitButton>Save time format</SubmitButton>
    </form>
  );
}
