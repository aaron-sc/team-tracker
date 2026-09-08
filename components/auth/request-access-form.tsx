"use client";

import { useActionState } from "react";
import { requestAccessAction, type RequestAccessState } from "@/lib/actions/access-request";
import { ACCESS_REQUEST_ROLES, ROSTER_SIZE_BUCKETS } from "@/lib/validations/access-request";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/auth/submit-button";

const ROLE_LABELS: Record<(typeof ACCESS_REQUEST_ROLES)[number], string> = {
  owner: "Owner / director",
  manager: "Manager",
  coach: "Coach",
  other: "Something else",
};

export function RequestAccessForm() {
  const [state, formAction] = useActionState<RequestAccessState, FormData>(requestAccessAction, undefined);

  if (state?.submitted) {
    return (
      <Alert>
        <AlertDescription className="space-y-2">
          <p className="font-medium text-foreground">Request received.</p>
          <p>
            If it&apos;s a fit, you&apos;ll get an email with a link to finish setting up your organization.
            This is a manual review, so it may take a little while.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="orgName">Organization name</Label>
          <Input id="orgName" name="orgName" placeholder="Nova Esports" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role">Your role there</Label>
          <Select name="role">
            <SelectTrigger id="role" className="w-full">
              <SelectValue placeholder="Select one" />
            </SelectTrigger>
            <SelectContent>
              {ACCESS_REQUEST_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="games">Game(s) you run teams for</Label>
          <Input id="games" name="games" placeholder="Valorant, Rocket League" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rosterSize">Approx. people in the org</Label>
          <Select name="rosterSize">
            <SelectTrigger id="rosterSize" className="w-full">
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              {ROSTER_SIZE_BUCKETS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="websiteUrl">Website (optional)</Label>
          <Input id="websiteUrl" name="websiteUrl" type="url" placeholder="https://" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="discordInvite">Discord invite (optional)</Label>
          <Input id="discordInvite" name="discordInvite" placeholder="discord.gg/…" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reason">What do you want to use Formation for?</Label>
        <Textarea id="reason" name="reason" rows={4} minLength={20} maxLength={2000} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="referral">How did you hear about Formation? (optional)</Label>
        <Input id="referral" name="referral" placeholder="A friend, search, Reddit, …" />
      </div>

      {/* Honeypot — hidden from real visitors, out of tab order. A bot that fills every field trips it. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton className="w-full">Request access</SubmitButton>
    </form>
  );
}
