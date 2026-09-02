"use client";

import { useState, useTransition } from "react";
import {
  enablePublicRosterAction,
  disablePublicRosterAction,
  rotatePublicRosterTokenAction,
} from "@/lib/actions/public-roster";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, RotateCw } from "lucide-react";

export function PublicRosterEmbedPanel({
  orgSlug,
  orgId,
  teamId,
  baseUrl,
  enabled,
  token,
}: {
  orgSlug: string;
  orgId: string;
  teamId: string;
  baseUrl: string;
  enabled: boolean;
  token: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [showJersey, setShowJersey] = useState(true);
  const [showPosition, setShowPosition] = useState(true);
  const [showBio, setShowBio] = useState(false);
  const [showTrackers, setShowTrackers] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const params = new URLSearchParams({
    theme,
    showJersey: showJersey ? "1" : "0",
    showPosition: showPosition ? "1" : "0",
    showBio: showBio ? "1" : "0",
    showTrackers: showTrackers ? "1" : "0",
  });
  const embedUrl = token ? `${baseUrl}/embed/roster/${token}?${params.toString()}` : null;
  const iframeCode = embedUrl
    ? `<iframe src="${embedUrl}" style="width:100%;height:600px;border:0;" title="Team roster"></iframe>`
    : "";

  function run(action: () => Promise<{ error?: string; success?: string } | undefined>) {
    startTransition(async () => {
      const result = await action();
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id="publicRosterEnabled"
          checked={enabled}
          disabled={pending}
          onCheckedChange={(checked) =>
            run(() =>
              checked
                ? enablePublicRosterAction(orgSlug, orgId, teamId)
                : disablePublicRosterAction(orgSlug, orgId, teamId),
            )
          }
        />
        <Label htmlFor="publicRosterEnabled" className="cursor-pointer font-normal">
          Enable public roster embed
        </Label>
        {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Generates an unauthenticated, read-only page anyone with the link can view — only names, avatars, positions,
        jersey numbers, and (if you turn them on below) bios/tracker links. Never email, phone, or Discord handles.
      </p>

      {enabled && embedUrl ? (
        <div className="space-y-4 rounded-lg border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Checkbox id="showJersey" checked={showJersey} onCheckedChange={(v) => setShowJersey(!!v)} />
              <Label htmlFor="showJersey" className="cursor-pointer font-normal">
                Show jersey numbers
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="showPosition" checked={showPosition} onCheckedChange={(v) => setShowPosition(!!v)} />
              <Label htmlFor="showPosition" className="cursor-pointer font-normal">
                Show positions
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="showBio" checked={showBio} onCheckedChange={(v) => setShowBio(!!v)} />
              <Label htmlFor="showBio" className="cursor-pointer font-normal">
                Show bios
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="showTrackers" checked={showTrackers} onCheckedChange={(v) => setShowTrackers(!!v)} />
              <Label htmlFor="showTrackers" className="cursor-pointer font-normal">
                Show tracker links
              </Label>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="embedTheme">Theme</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as "light" | "dark")}>
              <SelectTrigger id="embedTheme" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="iframeCode">Embed code</Label>
            <Textarea id="iframeCode" readOnly value={iframeCode} rows={3} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
            <p className="text-xs text-muted-foreground">Paste this into your website&apos;s HTML.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!confirm("Rotate the embed link? Any page already using the current iframe code will stop working.")) return;
              run(() => rotatePublicRosterTokenAction(orgSlug, orgId, teamId));
            }}
          >
            <RotateCw className="size-3.5" />
            Rotate link
          </Button>
        </div>
      ) : null}
    </div>
  );
}
