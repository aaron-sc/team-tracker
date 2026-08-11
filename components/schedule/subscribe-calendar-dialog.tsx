"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarPlus, Copy, Check } from "lucide-react";

export function SubscribeCalendarDialog({ orgSlug, apiKey }: { orgSlug: string; apiKey: string | null }) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined" && apiKey ? `${window.location.origin}/api/v1/${orgSlug}/calendar.ics?key=${apiKey}` : "";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CalendarPlus className="size-4" />
          Subscribe
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subscribe to this schedule</DialogTitle>
        </DialogHeader>
        {apiKey ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Add this URL in Google Calendar, Apple Calendar, or Outlook to keep matches and practices in sync.
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={url} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Generate an API key first in{" "}
            <Link href={`/${orgSlug}/settings/integrations`} className="text-primary underline underline-offset-4">
              Settings → Integrations
            </Link>{" "}
            — it&apos;s reused to authorize this feed.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
