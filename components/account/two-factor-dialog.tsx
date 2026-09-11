"use client";

import { useState, useTransition } from "react";
import {
  startTotpEnrollAction,
  confirmTotpEnrollAction,
  type ConfirmTotpState,
} from "@/lib/actions/account-security";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ShieldCheck, Copy, Check } from "lucide-react";

type Step =
  | { name: "start" }
  | { name: "scan"; secret: string; qrDataUri: string }
  | { name: "codes"; recoveryCodes: string[] };

export function TwoFactorDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>({ name: "start" });
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function reset() {
    setStep({ name: "start" });
    setError(undefined);
    setCopied(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handleGenerate() {
    startTransition(async () => {
      const result = await startTotpEnrollAction();
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else if (result && "secret" in result) {
        setError(undefined);
        setStep({ name: "scan", secret: result.secret, qrDataUri: result.qrDataUri });
      }
    });
  }

  function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result: ConfirmTotpState = await confirmTotpEnrollAction(undefined, formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else if (result && "recoveryCodes" in result) {
        setError(undefined);
        setStep({ name: "codes", recoveryCodes: result.recoveryCodes });
      }
    });
  }

  function handleDone() {
    setOpen(false);
    reset();
    window.location.reload();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <ShieldCheck className="size-4" />
        Enable two-factor authentication
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step.name === "start" && "Set up two-factor authentication"}
            {step.name === "scan" && "Scan the QR code"}
            {step.name === "codes" && "Save your recovery codes"}
          </DialogTitle>
        </DialogHeader>

        {step.name === "start" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You&apos;ll need an authenticator app — Google Authenticator, 1Password, Authy, or similar.
            </p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button onClick={handleGenerate} disabled={pending} className="w-full">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Get started
            </Button>
          </div>
        ) : null}

        {step.name === "scan" ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              {/* A data: URI generated server-side per enrollment — next/image's optimizer can't
                  (and doesn't need to) process it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={step.qrDataUri} alt="Scan this QR code with your authenticator app" className="size-48" />
            </div>
            <div className="space-y-1.5">
              <Label>Or enter this key manually</Label>
              <div className="flex gap-2">
                <Input readOnly value={step.secret} className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(step.secret);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>
            <form onSubmit={handleConfirm} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="totp-code">6-digit code</Label>
                <Input id="totp-code" name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirm
              </Button>
            </form>
          </div>
        ) : null}

        {step.name === "codes" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Two-factor authentication is on. Save these recovery codes somewhere safe — each works once, and this
              is the only time they&apos;re shown. Use one if you lose access to your authenticator app.
            </p>
            <div className="grid grid-cols-2 gap-1.5 rounded-md border bg-muted/40 p-3 font-mono text-sm">
              {step.recoveryCodes.map((code) => (
                <span key={code}>{code}</span>
              ))}
            </div>
            <Button onClick={handleDone} className="w-full">
              I&apos;ve saved these codes
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
