"use client";

import { useMemo, useState, useTransition } from "react";
import { startConversationAction } from "@/lib/actions/messages";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

type OrgMember = { id: string; name: string; email: string | null };

export function NewConversationDialog({
  orgSlug,
  orgId,
  members,
}: {
  orgSlug: string;
  orgId: string;
  members: OrgMember[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q));
  }, [members, query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <MessageSquarePlus className="size-4" />
          New message
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Search members…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No members found.</p>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await startConversationAction(orgSlug, orgId, m.id);
                    if (result?.error) toast.error(result.error);
                  });
                }}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
              >
                <Avatar className="size-8">
                  <AvatarFallback>
                    {m.name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{m.name}</p>
                  {m.email ? <p className="text-xs text-muted-foreground">{m.email}</p> : null}
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
