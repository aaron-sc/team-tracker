"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";

export function ProspectForm({
  action,
  teams,
  defaultValues,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  teams: { id: string; name: string }[];
  defaultValues?: {
    name?: string;
    level?: string;
    game?: string;
    teamId?: string;
    email?: string;
    phone?: string;
    discordHandle?: string;
    schoolOrOrg?: string;
    statsLinks?: string;
    socialLinks?: string;
    notes?: string;
  };
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={defaultValues?.name} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="level">Level</Label>
          <Select name="level" defaultValue={defaultValues?.level ?? "HIGH_SCHOOL"}>
            <SelectTrigger id="level" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HIGH_SCHOOL">High School</SelectItem>
              <SelectItem value="COLLEGE">College</SelectItem>
              <SelectItem value="PRO">Pro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="game">Game</Label>
          <Input id="game" name="game" placeholder="Valorant" defaultValue={defaultValues?.game} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="teamId">Target team (optional)</Label>
          <Select name="teamId" defaultValue={defaultValues?.teamId || "none"}>
            <SelectTrigger id="teamId" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Org-wide</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultValues?.email} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={defaultValues?.phone} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="discordHandle">Discord</Label>
          <Input id="discordHandle" name="discordHandle" defaultValue={defaultValues?.discordHandle} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="schoolOrOrg">Current school / org</Label>
        <Input id="schoolOrOrg" name="schoolOrOrg" defaultValue={defaultValues?.schoolOrOrg} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="statsLinks">Stats links (one per line, &quot;label | url&quot;)</Label>
          <Textarea id="statsLinks" name="statsLinks" rows={3} defaultValue={defaultValues?.statsLinks} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="socialLinks">Social links (one per line, &quot;label | url&quot;)</Label>
          <Textarea id="socialLinks" name="socialLinks" rows={3} defaultValue={defaultValues?.socialLinks} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={4} defaultValue={defaultValues?.notes} />
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton>Save prospect</SubmitButton>
    </form>
  );
}
