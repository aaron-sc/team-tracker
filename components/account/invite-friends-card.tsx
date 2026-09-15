"use client";

import { useActionState, useState } from "react";
import { createUserInviteAction, type ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/auth/submit-button";
import { Copy, Check, UserPlus } from "lucide-react";

export type SentInvite = {
  id: string;
  token: string;
  consumedAt: string | null;
  consumedByEmail: string | null;
  expiresAt: string;
};

function InviteRow({ invite }: { invite: SentInvite }) {
  const [copied, setCopied] = useState(false);
  const expired = !invite.consumedAt && new Date(invite.expiresAt) < new Date();

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-2.5 text-sm">
      <div>
        {invite.consumedAt ? (
          <p className="font-medium">{invite.consumedByEmail}</p>
        ) : (
          <p className="text-muted-foreground">Not used yet</p>
        )}
      </div>
      {invite.consumedAt ? (
        <Badge>Joined</Badge>
      ) : expired ? (
        <Badge variant="secondary">Expired</Badge>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            const url = `${window.location.origin}/signup?invite=${invite.token}`;
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
      )}
    </div>
  );
}

export function InviteFriendsCard({ invites, maxInvites }: { invites: SentInvite[]; maxInvites: number }) {
  const [state, formAction] = useActionState<ActionState, FormData>(createUserInviteAction, undefined);
  const remaining = maxInvites - invites.length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Skip the waitlist for people you vouch for — an invite link lets them create their own account and
        organization right away. {remaining} of {maxInvites} left.
      </p>

      {invites.length > 0 ? (
        <div className="space-y-2">
          {invites.map((invite) => (
            <InviteRow key={invite.id} invite={invite} />
          ))}
        </div>
      ) : null}

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      {remaining > 0 ? (
        <form action={formAction}>
          <SubmitButton variant="outline">
            <UserPlus className="size-4" />
            Create invite link
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
