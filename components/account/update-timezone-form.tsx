"use client";

import { useActionState, useEffect, useState } from "react";
import { updateTimezoneAction, type UpdateTimezoneState } from "@/lib/actions/auth";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";

export function UpdateTimezoneForm({ currentTimezone, timezones }: { currentTimezone: string | null; timezones: string[] }) {
  const [state, formAction] = useActionState<UpdateTimezoneState, FormData>(updateTimezoneAction, undefined);
  const [timezone, setTimezone] = useState(currentTimezone ?? "");

  useEffect(() => {
    if (currentTimezone) return;
    // Browser-only detection, so it's read post-mount rather than during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [currentTimezone]);

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="timezone">Your timezone</Label>
        <Select name="timezone" value={timezone} onValueChange={setTimezone}>
          <SelectTrigger id="timezone" className="w-full">
            <SelectValue placeholder="Choose a timezone" />
          </SelectTrigger>
          <SelectContent>
            {timezones.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Match and practice times are shown to you in this timezone, no matter where the organization is based.
        </p>
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}
      <SubmitButton>Save timezone</SubmitButton>
    </form>
  );
}
