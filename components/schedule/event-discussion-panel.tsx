"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Send, Trash2, Loader2 } from "lucide-react";
import type { ActionState } from "@/lib/actions/types";

export type DiscussionComment = {
  id: string;
  body: string;
  authorName: string;
  membershipId: string;
  createdAt: string;
};

/** Shared chat UI for both match and practice discussion threads — the parent page binds the
 *  matchId/sessionId into the server actions it passes in, so this component stays agnostic to
 *  which event type it's attached to. */
export function EventDiscussionPanel({
  comments,
  currentMembershipId,
  canPost,
  canModerate,
  onPost,
  onDelete,
}: {
  comments: DiscussionComment[];
  currentMembershipId: string;
  canPost: boolean;
  canModerate: boolean;
  onPost: (formData: FormData) => Promise<ActionState>;
  onDelete: (commentId: string) => Promise<ActionState>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await onPost(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        form.reset();
      }
    });
  }

  return (
    <div className="space-y-3">
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No messages yet — first one in.</p>
      ) : (
        <div className="max-h-80 space-y-3 overflow-y-auto">
          {comments.map((c) => {
            const mine = c.membershipId === currentMembershipId;
            return (
              <div key={c.id} className="flex items-start justify-between gap-2 text-sm">
                <div>
                  <p>
                    <span className="font-medium">{c.authorName}</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </span>
                  </p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{c.body}</p>
                </div>
                {mine || canModerate ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await onDelete(c.id);
                        if (result?.error) toast.error(result.error);
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {canPost ? (
        <form onSubmit={handleSubmit} className="flex items-start gap-2">
          <Textarea name="body" placeholder="Talk strategy…" rows={2} maxLength={2000} required className="flex-1" />
          <Button type="submit" size="icon" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
