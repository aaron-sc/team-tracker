"use client";

import { useState, useTransition } from "react";
import { addTeamResourceLinkAction, deleteTeamResourceLinkAction } from "@/lib/actions/team-resources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ExternalLink, Plus, Trash2, Loader2, Link2 } from "lucide-react";

type ResourceLink = { id: string; title: string; url: string };

export function TeamResourcesPanel({
  orgSlug,
  orgId,
  teamId,
  teamSlug,
  links,
  canManage,
}: {
  orgSlug: string;
  orgId: string;
  teamId: string;
  teamSlug: string;
  links: ResourceLink[];
  canManage: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addTeamResourceLinkAction(orgSlug, orgId, teamId, teamSlug, undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setAdding(false);
      }
    });
  }

  return (
    <div className="space-y-2">
      {links.length === 0 && !adding ? <p className="text-sm text-muted-foreground">No resources pinned yet.</p> : null}
      {links.map((link) => (
        <div key={link.id} className="flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm">
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 items-center gap-2 text-primary underline-offset-4 hover:underline"
          >
            <Link2 className="size-3.5 shrink-0" />
            <span className="truncate">{link.title}</span>
            <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
          </a>
          {canManage ? (
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={pending}
              onClick={() => {
                if (!confirm(`Remove "${link.title}"?`)) return;
                startTransition(async () => {
                  const result = await deleteTeamResourceLinkAction(orgSlug, orgId, link.id, teamSlug);
                  if (result?.error) toast.error(result.error);
                });
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ))}

      {canManage ? (
        adding ? (
          <form onSubmit={handleAdd} className="space-y-2 rounded-md border p-3">
            <Input name="title" placeholder="Title (e.g. Strat doc)" required />
            <Input name="url" placeholder="https://…" required />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Add
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            Add resource
          </Button>
        )
      ) : null}
    </div>
  );
}
