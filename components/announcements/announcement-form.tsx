"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";

export function AnnouncementForm({
  action,
  teams,
  canPin,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  teams: { id: string; name: string }[];
  canPin: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="body">Message</Label>
        <Textarea id="body" name="body" rows={6} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="teamId">Audience</Label>
        <Select name="teamId" defaultValue="none">
          <SelectTrigger id="teamId" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Entire organization</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {canPin ? (
        <div className="flex items-center gap-2">
          <Checkbox id="pinned" name="pinned" />
          <Label htmlFor="pinned" className="cursor-pointer font-normal">
            Pin to top
          </Label>
        </div>
      ) : null}
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton>Post announcement</SubmitButton>
    </form>
  );
}
