"use client";

import { useActionState } from "react";
import { updateAuditRetentionAction } from "@/lib/actions/audit";
import { AUDIT_RETENTION_OPTIONS } from "@/lib/constants/audit-retention";
import type { ActionState } from "@/lib/actions/types";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";

export function AuditRetentionForm({
  orgSlug,
  orgId,
  retentionDays,
}: {
  orgSlug: string;
  orgId: string;
  retentionDays: number | null;
}) {
  const action = updateAuditRetentionAction.bind(null, orgSlug, orgId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const defaultValue = retentionDays == null ? "forever" : String(retentionDays);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="retention">Keep audit log entries for</Label>
        <Select key={defaultValue} name="retention" defaultValue={defaultValue}>
          <SelectTrigger id="retention" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUDIT_RETENTION_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <SubmitButton variant="outline">Save</SubmitButton>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}
    </form>
  );
}
