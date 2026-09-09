"use client";

import { useActionState } from "react";
import { updateNotificationPreferencesAction, type UpdateNotificationPreferencesState } from "@/lib/actions/auth";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/constants/notification-types";

export function NotificationPreferencesForm({ mutedTypes }: { mutedTypes: string[] }) {
  const [state, formAction] = useActionState<UpdateNotificationPreferencesState, FormData>(
    updateNotificationPreferencesAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose which events still notify you in-app and by push. Unchecked types are muted everywhere.
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {Object.entries(NOTIFICATION_TYPE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-2">
            <Checkbox id={`notif-${type}`} name="subscribed" value={type} defaultChecked={!mutedTypes.includes(type)} />
            <Label htmlFor={`notif-${type}`} className="cursor-pointer font-normal">
              {label}
            </Label>
          </div>
        ))}
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}
      <SubmitButton>Save preferences</SubmitButton>
    </form>
  );
}
