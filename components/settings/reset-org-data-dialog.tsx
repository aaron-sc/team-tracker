"use client";

import { useState, useTransition } from "react";
import { resetOrgDataAction } from "@/lib/actions/org-reset";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, TriangleAlert } from "lucide-react";

export function ResetOrgDataDialog({ orgSlug, orgId, orgName }: { orgSlug: string; orgId: string; orgName: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await resetOrgDataAction(orgSlug, orgId, undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        toast.success(result?.success ?? "Organization data reset.");
        setOpen(false);
        setConfirmText("");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setConfirmText("");
          setError(undefined);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Reset organization data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-5 text-destructive" />
            Reset organization data
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="space-y-1">
            <p className="font-medium text-destructive">This permanently deletes, for every team in this org:</p>
            <ul className="list-inside list-disc text-muted-foreground">
              <li>Roster assignments (who&apos;s on which team)</li>
              <li>Scheduled matches and practices/scrims, with attendance</li>
              <li>The recruitment pipeline (prospects and their history)</li>
              <li>Messages and announcements</li>
            </ul>
          </div>
          <div className="space-y-1">
            <p className="font-medium">Kept as-is:</p>
            <p className="text-muted-foreground">
              The organization itself, its teams (as empty shells), roles &amp; permissions, everyone&apos;s
              membership, venues, and the audit log.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="confirmName">
                Type <span className="font-semibold">{orgName}</span> to confirm
              </Label>
              <Input
                id="confirmName"
                name="confirmName"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" variant="destructive" disabled={pending || confirmText !== orgName}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Permanently reset data
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
