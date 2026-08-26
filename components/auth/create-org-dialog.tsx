"use client";

import { useActionState } from "react";
import { createAdditionalOrgAction, type ActionState } from "@/lib/actions/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { Plus } from "lucide-react";

function CreateOrgFormBody() {
  const [state, formAction] = useActionState<ActionState, FormData>(createAdditionalOrgAction, undefined);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create an organization</DialogTitle>
      </DialogHeader>
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="orgName">Organization name</Label>
          <Input id="orgName" name="orgName" placeholder="Nova Esports" required autoFocus />
        </div>
        <p className="text-xs text-muted-foreground">
          You&apos;ll be the Owner. Your existing organizations and memberships stay exactly as they are.
        </p>
        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <SubmitButton>Create organization</SubmitButton>
      </form>
    </DialogContent>
  );
}

/**
 * Two usage modes: pass `open`/`onOpenChange` when triggering from elsewhere
 * (e.g. a DropdownMenuItem — nesting a DialogTrigger directly inside a menu
 * item is a known Radix gotcha where the menu closing unmounts the trigger
 * before the dialog opens). Otherwise it manages its own open state behind a
 * built-in trigger button.
 */
export function CreateOrgDialog({
  trigger,
  open,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  if (open !== undefined) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <CreateOrgFormBody />
      </Dialog>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Plus className="size-4" />
            New organization
          </Button>
        )}
      </DialogTrigger>
      <CreateOrgFormBody />
    </Dialog>
  );
}
