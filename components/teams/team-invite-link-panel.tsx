"use client";

import { useActionState, useState, useTransition } from "react";
import { createTeamInviteLinkAction, revokeTeamInviteLinkAction } from "@/lib/actions/team-invite-links";
import type { ActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { toast } from "sonner";
import { Copy, Check, Trash2, Link2 } from "lucide-react";

type LinkRow = { id: string; token: string; teamName: string; roleName: string; useCount: number };

export function TeamInviteLinkPanel({
  orgSlug,
  orgId,
  teams,
  roles,
  links,
}: {
  orgSlug: string;
  orgId: string;
  teams: { id: string; name: string }[];
  roles: { id: string; name: string }[];
  links: LinkRow[];
}) {
  const action = createTeamInviteLinkAction.bind(null, orgSlug, orgId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const [pending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        {teams.length > 1 ? (
          <div className="space-y-1.5">
            <Label htmlFor="teamId">Team</Label>
            <Select name="teamId" defaultValue={teams[0]?.id}>
              <SelectTrigger id="teamId" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <input type="hidden" name="teamId" value={teams[0]?.id ?? ""} />
        )}
        <div className="space-y-1.5">
          <Label htmlFor="roleId">Role</Label>
          <Select name="roleId" defaultValue={roles[0]?.id}>
            <SelectTrigger id="roleId" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SubmitButton>
          <Link2 className="size-4" />
          Create link
        </SubmitButton>
      </form>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

      {links.length > 0 ? (
        <div className="space-y-2">
          {links.map((link) => (
            <div key={link.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
              <div className="flex-1">
                <p className="font-medium">
                  {link.teamName} · {link.roleName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Used {link.useCount} time{link.useCount === 1 ? "" : "s"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const url = `${window.location.origin}/join/${link.token}`;
                  await navigator.clipboard.writeText(url);
                  setCopiedId(link.id);
                  setTimeout(() => setCopiedId(null), 1500);
                }}
              >
                {copiedId === link.id ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => {
                  if (!confirm("Revoke this invite link? It will stop working immediately.")) return;
                  startTransition(async () => {
                    const result = await revokeTeamInviteLinkAction(orgSlug, orgId, link.id);
                    if (result?.error) toast.error(result.error);
                  });
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No active invite links.</p>
      )}
    </div>
  );
}
