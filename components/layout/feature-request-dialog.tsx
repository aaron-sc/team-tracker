"use client";

import { useState, useTransition } from "react";
import { submitFeatureRequestAction } from "@/lib/actions/feedback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Lightbulb, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function FeatureRequestDialog({ orgName }: { orgName: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitFeatureRequestAction(orgName, undefined, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      setOpen(false);
      toast.success(result?.success ?? "Sent!");
      (document.getElementById("feature-request-form") as HTMLFormElement | null)?.reset();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
          <Lightbulb className="size-4" />
          <span className="hidden md:inline">Feature request</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a feature</DialogTitle>
          <DialogDescription>Tell us what would make Formation better for your org — this goes straight to the team.</DialogDescription>
        </DialogHeader>
        <form id="feature-request-form" onSubmit={handleSubmit} className="space-y-3">
          <Textarea name="message" placeholder="I'd love to see…" rows={5} maxLength={2000} required autoFocus />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Send
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
