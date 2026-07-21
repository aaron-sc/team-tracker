"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";

const STATUSES = ["SCHEDULED", "LIVE", "COMPLETED", "CANCELLED", "FORFEIT"] as const;
const RESULTS = ["WIN", "LOSS", "DRAW"] as const;

export function MatchResultForm({
  action,
  defaultValues,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues: { status: string; resultStatus?: string | null; scoreFor?: number | null; scoreAgainst?: number | null };
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="status">Status</Label>
        <Select name="status" defaultValue={defaultValues.status}>
          <SelectTrigger id="status" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="resultStatus">Result</Label>
        <Select name="resultStatus" defaultValue={defaultValues.resultStatus ?? undefined}>
          <SelectTrigger id="resultStatus" className="w-32">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {RESULTS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="scoreFor">Score (us)</Label>
        <Input id="scoreFor" name="scoreFor" type="number" min={0} className="w-20" defaultValue={defaultValues.scoreFor ?? undefined} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="scoreAgainst">Score (them)</Label>
        <Input id="scoreAgainst" name="scoreAgainst" type="number" min={0} className="w-20" defaultValue={defaultValues.scoreAgainst ?? undefined} />
      </div>
      <SubmitButton>Save result</SubmitButton>
      {state?.error ? <p className="w-full text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
