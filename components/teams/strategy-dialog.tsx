"use client";

import { useState, useTransition } from "react";
import { createStrategyAction, updateStrategyAction } from "@/lib/actions/strategies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Loader2, X } from "lucide-react";

type AgentRow = { role: string; agent: string };

export function StrategyDialog({
  orgSlug,
  orgId,
  teamId,
  teamSlug,
  strategy,
}: {
  orgSlug: string;
  orgId: string;
  teamId: string;
  teamSlug: string;
  strategy?: {
    id: string;
    map: string;
    title: string;
    notes: string | null;
    agents: AgentRow[] | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const [agentRows, setAgentRows] = useState<AgentRow[]>(strategy?.agents && strategy.agents.length > 0 ? strategy.agents : [{ role: "", agent: "" }]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = strategy
        ? await updateStrategyAction(orgSlug, orgId, strategy.id, teamSlug, undefined, formData)
        : await createStrategyAction(orgSlug, orgId, teamId, teamSlug, undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {strategy ? (
          <Button variant="ghost" size="icon-sm">
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" />
            Add strategy
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{strategy ? "Edit strategy" : "Add a strategy"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="map">Map</Label>
              <Input id="map" name="map" defaultValue={strategy?.map} placeholder="Ascent, Haven…" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={strategy?.title} placeholder="A-site execute" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Agent comp</Label>
            <div className="space-y-2">
              {agentRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    name="agentRole"
                    defaultValue={row.role}
                    placeholder="Role (Duelist, IGL…)"
                    className="flex-1"
                  />
                  <Input name="agentAgent" defaultValue={row.agent} placeholder="Agent / character" className="flex-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setAgentRows((rows) => rows.filter((_, idx) => idx !== i))}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            {agentRows.length < 10 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAgentRows((rows) => [...rows, { role: "", agent: "" }])}
              >
                <Plus className="size-3.5" />
                Add role
              </Button>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={strategy?.notes ?? ""}
              placeholder="Executes, setups, callouts, fallback plans…"
              rows={5}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {strategy ? "Save changes" : "Add strategy"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
