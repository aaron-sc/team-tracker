"use client";

import { useActionState, useEffect } from "react";
import { updateHiddenNavItemsAction, type UpdateNavItemsState } from "@/lib/actions/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { NAV_ITEM_GROUPS, NAV_ITEM_LABELS } from "@/lib/constants/nav-items";

function NavbarCustomizeForm({ hiddenItems, onSaved }: { hiddenItems: string[]; onSaved: () => void }) {
  const [state, formAction] = useActionState<UpdateNavItemsState, FormData>(updateHiddenNavItemsAction, undefined);

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="max-h-[70vh] space-y-5 overflow-y-auto">
      {NAV_ITEM_GROUPS.map((group) => (
        <div key={group.label} className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">{group.label}</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox id={`nav-${key}`} name="shown" value={key} defaultChecked={!hiddenItems.includes(key)} />
                <Label htmlFor={`nav-${key}`} className="cursor-pointer font-normal">
                  {NAV_ITEM_LABELS[key]}
                </Label>
              </div>
            ))}
          </div>
        </div>
      ))}
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton>Save</SubmitButton>
    </form>
  );
}

/** Reached from the profile menu's "Customize navbar" item — lets each person hide the icons and
 *  sidebar links they personally don't use. Persisted per-account (User.hiddenNavItems), not
 *  per-browser, and never touches what anyone else sees. */
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
          <DialogDescription>
            Choose which icons and sidebar links show up for you. Only affects your own view.
          </DialogDescription>
        </DialogHeader>
        <NavbarCustomizeForm hiddenItems={hiddenItems} onSaved={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
