"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProspectLevelAction } from "@/lib/actions/prospect-levels";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";

export function ProspectLevelForm({ orgSlug, orgId }: { orgSlug: string; orgId: string }) {
  const action = createProspectLevelAction.bind(null, orgSlug, orgId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex items-end gap-2">
      <div className="flex-1 space-y-1.5">
        <Input name="name" placeholder="e.g. Amateur, Semi-Pro, Academy" required maxLength={40} />
      </div>
      <SubmitButton>Add level</SubmitButton>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
