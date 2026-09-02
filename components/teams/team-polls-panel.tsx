"use client";

import { useState, useTransition } from "react";
import { createPollAction, votePollAction, closePollAction, deletePollAction } from "@/lib/actions/polls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Loader2, X, Lock } from "lucide-react";

type PollOption = { id: string; label: string; voteCount: number };
type PollItem = {
  id: string;
  question: string;
  closesAt: string | null;
  options: PollOption[];
  totalVotes: number;
  myVoteOptionId: string | null;
};

export function TeamPollsPanel({
  orgSlug,
  orgId,
  teamId,
  polls,
  canManage,
}: {
  orgSlug: string;
  orgId: string;
  teamId: string;
  polls: PollItem[];
  canManage: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [optionCount, setOptionCount] = useState(2);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createPollAction(orgSlug, orgId, teamId, undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setCreating(false);
        setOptionCount(2);
      }
    });
  }

  return (
    <div className="space-y-3">
      {polls.length === 0 && !creating ? <p className="text-sm text-muted-foreground">No polls yet.</p> : null}

      {polls.map((poll) => {
        const isClosed = poll.closesAt !== null && new Date(poll.closesAt) < new Date();
        return (
          <div key={poll.id} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{poll.question}</p>
              {isClosed ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="size-3" />
                  Closed
                </span>
              ) : null}
            </div>
            <div className="space-y-1.5">
              {poll.options.map((opt) => {
                const pct = poll.totalVotes > 0 ? Math.round((opt.voteCount / poll.totalVotes) * 100) : 0;
                const mine = poll.myVoteOptionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isClosed || pending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await votePollAction(orgSlug, orgId, poll.id, opt.id);
                        if (result?.error) toast.error(result.error);
                      });
                    }}
                    className="relative block w-full overflow-hidden rounded-md border text-left text-sm disabled:cursor-default"
                  >
                    <div className="absolute inset-y-0 left-0 bg-primary/10" style={{ width: `${pct}%` }} />
                    <div className="relative flex items-center justify-between px-2.5 py-1.5">
                      <span className={mine ? "font-medium" : ""}>
                        {opt.label}
                        {mine ? " ✓" : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {opt.voteCount} · {pct}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            {canManage ? (
              <div className="flex gap-2">
                {!isClosed ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await closePollAction(orgSlug, orgId, poll.id);
                      })
                    }
                  >
                    Close poll
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm("Delete this poll?")) return;
                    startTransition(async () => {
                      await deletePollAction(orgSlug, orgId, poll.id);
                    });
                  }}
                >
                  <X className="size-3.5" />
                  Delete
                </Button>
              </div>
            ) : null}
          </div>
        );
      })}

      {canManage ? (
        creating ? (
          <form onSubmit={handleCreate} className="space-y-2 rounded-md border p-3">
            <Input name="question" placeholder="Question (e.g. Which day works for scrim?)" required />
            {Array.from({ length: optionCount }).map((_, i) => (
              <Input key={i} name="options" placeholder={`Option ${i + 1}`} required />
            ))}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOptionCount((n) => Math.min(n + 1, 10))}>
                <Plus className="size-3.5" />
                Add option
              </Button>
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Post poll
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            New poll
          </Button>
        )
      ) : null}
    </div>
  );
}
