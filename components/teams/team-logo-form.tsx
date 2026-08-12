"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { updateTeamLogoAction, removeTeamLogoAction } from "@/lib/actions/teams";
import type { ActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/auth/submit-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function TeamLogoForm({
  orgSlug,
  orgId,
  teamId,
  teamName,
  logoUrl,
}: {
  orgSlug: string;
  orgId: string;
  teamId: string;
  teamName: string;
  logoUrl: string | null;
}) {
  const action = updateTeamLogoAction.bind(null, orgSlug, orgId, teamId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = teamName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Avatar className="size-16 rounded-lg">
          {preview || logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview ?? logoUrl ?? ""} alt={teamName} className="size-full rounded-lg object-cover" />
          ) : (
            <AvatarFallback className="rounded-lg text-lg">{initials || "?"}</AvatarFallback>
          )}
        </Avatar>
        <form action={formAction} className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setPreview(URL.createObjectURL(file));
            }}
            className="text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          <div className="flex gap-2">
            <SubmitButton>Upload logo</SubmitButton>
            {logoUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => {
                  if (!confirm("Remove the team logo?")) return;
                  startTransition(async () => {
                    const result = await removeTeamLogoAction(orgSlug, orgId, teamId);
                    if (result?.error) toast.error(result.error);
                    else toast.success("Logo removed.");
                  });
                }}
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            ) : null}
          </div>
        </form>
      </div>
      <p className="text-xs text-muted-foreground">PNG, JPEG, WebP, or SVG. Up to 2MB.</p>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}
    </div>
  );
}
