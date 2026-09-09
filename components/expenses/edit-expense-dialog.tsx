"use client";

import { useState, useTransition } from "react";
import { updateExpenseAction } from "@/lib/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Loader2 } from "lucide-react";

type Team = { id: string; name: string };

export function EditExpenseDialog({
  orgSlug,
  orgId,
  expenseId,
  teams,
  defaultValues,
}: {
  orgSlug: string;
  orgId: string;
  expenseId: string;
  teams: Team[];
  defaultValues: { category: string; description: string; amount: string; incurredAt: string; teamId: string };
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateExpenseAction(orgSlug, orgId, expenseId, undefined, formData);
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
        <Button variant="ghost" size="icon-sm">
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-expense-category">Category</Label>
              <Input id="edit-expense-category" name="category" defaultValue={defaultValues.category} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-expense-amount">Amount (USD)</Label>
              <Input
                id="edit-expense-amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={defaultValues.amount}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-expense-description">Description</Label>
            <Input id="edit-expense-description" name="description" defaultValue={defaultValues.description} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-expense-incurredAt">Date</Label>
              <Input id="edit-expense-incurredAt" name="incurredAt" type="date" defaultValue={defaultValues.incurredAt} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-expense-teamId">Team (optional)</Label>
              <Select name="teamId" defaultValue={defaultValues.teamId}>
                <SelectTrigger id="edit-expense-teamId" className="w-full">
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
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
