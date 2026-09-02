"use client";

import { useState, useTransition } from "react";
import { createExpenseAction } from "@/lib/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";

type Team = { id: string; name: string };

export function ExpenseDialog({ orgSlug, orgId, teams }: { orgSlug: string; orgId: string; teams: Team[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createExpenseAction(orgSlug, orgId, undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
        (document.getElementById("expense-form") as HTMLFormElement | null)?.reset();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Log expense
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log an expense</DialogTitle>
        </DialogHeader>
        <form id="expense-form" onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" placeholder="Travel, gear, entry fee…" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="incurredAt">Date</Label>
              <Input id="incurredAt" name="incurredAt" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teamId">Team (optional)</Label>
              <Select name="teamId" defaultValue="none">
                <SelectTrigger id="teamId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Org-wide</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Log expense
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
