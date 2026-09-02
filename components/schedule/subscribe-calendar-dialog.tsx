"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarPlus, Copy, Check, RefreshCw, Loader2 } from "lucide-react";
import { getOrCreateCalendarTokenAction, rotateCalendarTokenAction } from "@/lib/actions/calendar-token";
import { toast } from "sonner";

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <Input readOnly value={value} className="font-mono text-xs" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}

function MyScheduleTab({ orgSlug }: { orgSlug: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getOrCreateCalendarTokenAction(orgSlug);
      setToken(result.token);
    });
  }, [orgSlug]);

  const httpsUrl =
    token && typeof window !== "undefined" ? `${window.location.origin}/api/v1/${orgSlug}/me/calendar.ics?token=${token}` : "";
  const webcalUrl = httpsUrl.replace(/^https?:\/\//, "webcal://");

  if (!token) {
    return (
      <p className="flex items-center gap-1.5 py-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Setting up your link…
      </p>
    );
  }

  return (
    <div className="space-y-3 pt-1">
      <p className="text-sm text-muted-foreground">
        Just the teams you&apos;re on — add it to Google Calendar, Apple Calendar, or Outlook and it stays in sync. No
        login needed to view it, so don&apos;t share it publicly.
      </p>
      <CopyField value={httpsUrl} />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <a href={webcalUrl} className="underline underline-offset-2 hover:text-foreground">
          Open in your default calendar app
        </a>
        <span>·</span>
        <a
          href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(httpsUrl)}`}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Add to Google Calendar
        </a>
        <span>·</span>
        <button
          type="button"
          disabled={pending}
          className="underline underline-offset-2 hover:text-foreground disabled:opacity-50"
          onClick={() => {
            if (!confirm("Get a new link? The current one will stop working — update it anywhere you've added it.")) return;
            startTransition(async () => {
              const result = await rotateCalendarTokenAction(orgSlug);
              setToken(result.token);
              toast.success("New calendar link generated.");
            });
          }}
        >
          <RefreshCw className="mr-1 inline size-3" />
          Get a new link
        </button>
      </div>
    </div>
  );
}

function OrgScheduleTab({ orgSlug, apiKey }: { orgSlug: string; apiKey: string | null }) {
  const url =
    typeof window !== "undefined" && apiKey ? `${window.location.origin}/api/v1/${orgSlug}/calendar.ics?key=${apiKey}` : "";

  if (!apiKey) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Generate an API key first in{" "}
        <Link href={`/${orgSlug}/settings/integrations`} className="text-primary underline underline-offset-4">
          Settings → Integrations
        </Link>{" "}
        — it&apos;s reused to authorize this feed. Ask an org owner or manager if you don&apos;t have access there.
      </p>
    );
  }

  return (
    <div className="space-y-3 pt-1">
      <p className="text-sm text-muted-foreground">
        Every team&apos;s matches and practices, org-wide. Shares the same key as the API — anyone with this link can
        see the full schedule, so treat it like a password.
      </p>
      <CopyField value={url} />
    </div>
  );
}

export function SubscribeCalendarDialog({ orgSlug, apiKey }: { orgSlug: string; apiKey: string | null }) {
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
          <DialogTitle>Subscribe to your schedule</DialogTitle>
          <DialogDescription>A live link you add once — it keeps itself in sync from here on.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="mine">
          <TabsList className="w-full">
            <TabsTrigger value="mine" className="flex-1">
              My schedule
            </TabsTrigger>
            <TabsTrigger value="org" className="flex-1">
              Whole org
            </TabsTrigger>
          </TabsList>
          <TabsContent value="mine">
            <MyScheduleTab orgSlug={orgSlug} />
          </TabsContent>
          <TabsContent value="org">
            <OrgScheduleTab orgSlug={orgSlug} apiKey={apiKey} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
