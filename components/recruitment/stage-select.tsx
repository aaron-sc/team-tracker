"use client";

import { useActionState, useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeProspectStageAction } from "@/lib/actions/prospects";
import type { ActionState } from "@/lib/actions/types";
import { toast } from "sonner";

const STAGES = ["SCOUTING", "CONTACTED", "TRYOUT", "OFFER", "SIGNED", "PASSED"] as const;

export function StageSelect({
  orgSlug,
  orgId,
  prospectId,
  stage,
}: {
  orgSlug: string;
  orgId: string;
  prospectId: string;
  stage: string;
}) {
  const action = changeProspectStageAction.bind(null, orgSlug, orgId, prospectId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <Select
        name="stage"
        defaultValue={stage}
        onValueChange={() => {
          formRef.current?.requestSubmit();
        }}
      >
        <SelectTrigger size="sm" className="w-32" onClick={(e) => e.stopPropagation()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STAGES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  );
}
