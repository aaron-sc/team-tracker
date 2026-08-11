"use client";

import { useActionState, useTransition } from "react";
import { renameProspectLevelAction, deleteProspectLevelAction } from "@/lib/actions/prospect-levels";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Check } from "lucide-react";
import { toast } from "sonner";

export function ProspectLevelRow({
  orgSlug,
  orgId,
  level,
}: {
  orgSlug: string;
  orgId: string;
  level: { id: string; name: string; prospectCount: number };
}) {
  const action = renameProspectLevelAction.bind(null, orgSlug, orgId, level.id);
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3">
        <form action={formAction} className="flex flex-1 items-center gap-2">
          <Input name="name" defaultValue={level.name} maxLength={40} className="max-w-xs" />
          <Button type="submit" variant="outline" size="sm">
            <Check className="size-4" />
            Save
          </Button>
        </form>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {level.prospectCount} prospect{level.prospectCount === 1 ? "" : "s"}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            const msg =
              level.prospectCount > 0
                ? `Delete "${level.name}"? ${level.prospectCount} prospect${level.prospectCount === 1 ? "" : "s"} will show as having no level.`
                : `Delete "${level.name}"?`;
            if (!confirm(msg)) return;
            startTransition(async () => {
              const result = await deleteProspectLevelAction(orgSlug, orgId, level.id);
              if (result?.error) toast.error(result.error);
            });
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      </CardContent>
      {state?.error ? <p className="px-4 pb-3 text-sm text-destructive">{state.error}</p> : null}
    </Card>
  );
}
