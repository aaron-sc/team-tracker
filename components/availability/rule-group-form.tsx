"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { convertWeeklyTime } from "@/lib/utils/availability-tz";
import { formatWallClockTime } from "@/lib/utils/format-time";
import { ArrowRight } from "lucide-react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function RuleGroupForm({
  action,
  defaultTimezone,
  timezones,
  defaultDays = [],
  defaultStartTime = "18:00",
  defaultEndTime = "21:00",
  submitLabel = "Add",
  onSaved,
  orgTimezone,
  hour12 = true,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultTimezone: string;
  timezones: string[];
  defaultDays?: number[];
  defaultStartTime?: string;
  defaultEndTime?: string;
  submitLabel?: string;
  onSaved?: () => void;
  /** The org's default timezone — shown in the live "this is what your team will see" preview. */
  orgTimezone: string;
  hour12?: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const [days, setDays] = useState<number[]>(defaultDays);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);
  const [timezone, setTimezone] = useState(defaultTimezone);

  useEffect(() => {
    if (state?.success) onSaved?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const preview = useMemo(() => {
    if (timezone === orgTimezone || !startTime || !endTime) return null;
    const referenceDay = days[0] ?? new Date().getDay();
    const convertedStart = convertWeeklyTime(referenceDay, startTime, timezone, orgTimezone);
    const convertedEnd = convertWeeklyTime(referenceDay, endTime, timezone, orgTimezone);
    const dayShifted = convertedStart.dayOfWeek !== referenceDay;
    return {
      startLabel: formatWallClockTime(convertedStart.time, hour12),
      endLabel: formatWallClockTime(convertedEnd.time, hour12),
      dayLabel: dayShifted ? DAY_LABELS_LONG[convertedStart.dayOfWeek] : null,
    };
  }, [timezone, orgTimezone, startTime, endTime, days, hour12]);

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
          <Input
            id="startTime"
            name="startTime"
            type="time"
            className="w-28"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endTime">End</Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            className="w-28"
            required
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <Select name="timezone" value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>

      {preview ? (
        <p className="flex flex-wrap items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
          <span>
            You&apos;re setting this as {formatWallClockTime(startTime, hour12)}–{formatWallClockTime(endTime, hour12)}{" "}
            ({timezone.replace(/_/g, " ")})
          </span>
          <ArrowRight className="size-3" />
          <span>
            shown to your team as {preview.dayLabel ? `${preview.dayLabel} ` : ""}
            {preview.startLabel}–{preview.endLabel} ({orgTimezone.replace(/_/g, " ")} org time)
          </span>
        </p>
      ) : null}

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
