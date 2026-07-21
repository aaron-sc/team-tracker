"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateApiKeyAction, revokeApiKeyAction } from "@/lib/actions/api-key";
import { toast } from "sonner";
import { Copy, Check, RefreshCw, Trash2 } from "lucide-react";

export function ApiKeyPanel({ orgSlug, orgId, apiKey }: { orgSlug: string; orgId: string; apiKey: string | null }) {
  const [pending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const masked = apiKey ? `${apiKey.slice(0, 9)}${"•".repeat(20)}` : null;

  return (
    <div className="space-y-3">
      {apiKey ? (
        <div className="flex items-center gap-2">
          <Input readOnly value={revealed ? apiKey : masked ?? ""} className="max-w-md font-mono text-sm" />
          <Button variant="outline" size="sm" onClick={() => setRevealed((r) => !r)}>
            {revealed ? "Hide" : "Reveal"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(apiKey);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No API key generated yet.</p>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (apiKey && !confirm("Generate a new key? The current key will stop working immediately.")) return;
            startTransition(async () => {
              await generateApiKeyAction(orgSlug, orgId);
              toast.success("API key generated.");
            });
          }}
        >
          <RefreshCw className="size-4" />
          {apiKey ? "Regenerate" : "Generate key"}
        </Button>
        {apiKey ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!confirm("Revoke this API key? Integrations using it will stop working.")) return;
              startTransition(async () => {
                await revokeApiKeyAction(orgSlug, orgId);
                toast.success("API key revoked.");
              });
            }}
          >
            <Trash2 className="size-4" />
            Revoke
          </Button>
        ) : null}
      </div>
    </div>
  );
}
