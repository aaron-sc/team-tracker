"use client";

import { useActionState, useState } from "react";
import { updateOrgProfileAction } from "@/lib/actions/members";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#6366f1", // indigo
  "#ef4444", // red
  "#f59e0b", // amber
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ec4899", // pink
];

export function OrgProfileForm({
  orgSlug,
  orgId,
  name,
  timezone,
  timezones,
  themeColor,
}: {
  orgSlug: string;
  orgId: string;
  name: string;
  timezone: string;
  timezones: string[];
  themeColor: string;
}) {
  const action = updateOrgProfileAction.bind(null, orgSlug, orgId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const [color, setColor] = useState(themeColor);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Organization name</Label>
        <Input id="name" name="name" defaultValue={name} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="timezone">Timezone</Label>
        <Select name="timezone" defaultValue={timezone}>
          <SelectTrigger id="timezone" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timezones.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="themeColor">Accent color</Label>
        <div className="flex items-center gap-2">
          <input
            id="themeColor"
            name="themeColor"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border bg-transparent p-0.5"
          />
          <Input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-28 font-mono uppercase"
            maxLength={7}
          />
          <div className="flex gap-1.5">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setColor(preset)}
                className={cn(
                  "size-6 rounded-full border-2 transition-transform hover:scale-110",
                  color.toLowerCase() === preset ? "border-foreground" : "border-transparent",
                )}
                style={{ backgroundColor: preset }}
                aria-label={preset}
              />
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Used for buttons, links, and highlights across the org.</p>
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}
      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}
