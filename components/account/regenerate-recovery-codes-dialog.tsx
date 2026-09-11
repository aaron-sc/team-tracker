"use client";

import { useState, useTransition } from "react";
import { regenerateRecoveryCodesAction, type RecoveryCodesState } from "@/lib/actions/account-security";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RotateCw } from "lucide-react";

export function RegenerateRecoveryCodesDialog() {
  const [open, setOpen] = useState(false);
  const [codes, setCodes] = useState<string[]>();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setCodes(undefined);
      setError(undefined);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result: RecoveryCodesState = await regenerateRecoveryCodesAction(undefined, formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else if (result && "recoveryCodes" in result) {
        setError(undefined);
        setCodes(result.recoveryCodes);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <RotateCw className="size-4" />
        Regenerate recovery codes
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{codes ? "New recovery codes" : "Regenerate recovery codes"}</DialogTitle>
        </DialogHeader>

        {codes ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your old recovery codes no longer work. Save these somewhere safe — this is the only time they&apos;re
              shown.
            </p>
            <div className="grid grid-cols-2 gap-1.5 rounded-md border bg-muted/40 p-3 font-mono text-sm">
              {codes.map((code) => (
                <span key={code}>{code}</span>
              ))}
            </div>
            <Button onClick={() => setOpen(false)} className="w-full">
              I&apos;ve saved these codes
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This replaces every existing recovery code. Confirm with a fresh code from your authenticator app.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="regen-code">Code</Label>
              <Input id="regen-code" name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Regenerate
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
