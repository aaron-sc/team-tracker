"use client";

import { useActionState, useEffect } from "react";
import { updateHiddenNavItemsAction, type UpdateNavItemsState } from "@/lib/actions/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { NAV_ITEM_LABELS } from "@/lib/constants/nav-items";

function NavbarCustomizeForm({ hiddenItems, onSaved }: { hiddenItems: string[]; onSaved: () => void }) {
  const [state, formAction] = useActionState<UpdateNavItemsState, FormData>(updateHiddenNavItemsAction, undefined);

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2.5">
        {Object.entries(NAV_ITEM_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2">
            <Checkbox id={`nav-${key}`} name="shown" value={key} defaultChecked={!hiddenItems.includes(key)} />
            <Label htmlFor={`nav-${key}`} className="cursor-pointer font-normal">
              {label}
            </Label>
          </div>
        ))}
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton>Save</SubmitButton>
    </form>
  );
}

/** Reached from the profile menu's "Customize navbar" item — lets each person hide the icons they
 *  personally don't use (search, Discord, etc.) from their own top nav. Persisted per-account
 *  (User.hiddenNavItems), not per-browser, and never touches what anyone else sees. */
export function NavbarCustomizeDialog({
  hiddenItems,
  open,
  onOpenChange,
}: {
  hiddenItems: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize navbar</DialogTitle>
          <DialogDescription>Choose which icons show up in your own top nav. Only affects you.</DialogDescription>
        </DialogHeader>
        <NavbarCustomizeForm hiddenItems={hiddenItems} onSaved={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
