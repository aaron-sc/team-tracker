"use client";

import { useState, useTransition } from "react";
import { updateAnnouncementAction } from "@/lib/actions/announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Loader2 } from "lucide-react";

export function EditAnnouncementDialog({
  orgSlug,
  orgId,
  announcementId,
  teams,
  canPin,
  defaultValues,
}: {
  orgSlug: string;
  orgId: string;
  announcementId: string;
  teams: { id: string; name: string }[];
  canPin: boolean;
  defaultValues: { title: string; body: string; teamId: string; pinned: boolean };
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateAnnouncementAction(orgSlug, orgId, announcementId, undefined, formData);
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
          <DialogTitle>Edit announcement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-announcement-title">Title</Label>
            <Input id="edit-announcement-title" name="title" defaultValue={defaultValues.title} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-announcement-body">Message</Label>
            <Textarea id="edit-announcement-body" name="body" rows={6} defaultValue={defaultValues.body} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-announcement-teamId">Audience</Label>
            <Select name="teamId" defaultValue={defaultValues.teamId}>
              <SelectTrigger id="edit-announcement-teamId" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Entire organization</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canPin ? (
            <div className="flex items-center gap-2">
              <Checkbox id="edit-announcement-pinned" name="pinned" defaultChecked={defaultValues.pinned} />
              <Label htmlFor="edit-announcement-pinned" className="cursor-pointer font-normal">
                Pin to top
              </Label>
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
