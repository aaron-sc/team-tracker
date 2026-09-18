"use client";

import { useState, useTransition } from "react";
import { createAssetAction, updateAssetAction } from "@/lib/actions/assets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Loader2 } from "lucide-react";

const CATEGORIES = [
  { value: "BANNER", label: "Banner" },
  { value: "MERCH", label: "Merch" },
  { value: "GRAPHIC", label: "Graphic" },
  { value: "LOGO", label: "Logo" },
  { value: "TEMPLATE", label: "Template" },
  { value: "OTHER", label: "Other" },
] as const;

type Team = { id: string; name: string };

export function AssetDialog({
  orgSlug,
  orgId,
  teams,
  asset,
}: {
  orgSlug: string;
  orgId: string;
  teams: Team[];
  asset?: {
    id: string;
    title: string;
    category: string;
    teamId: string | null;
    notes: string | null;
    fileName: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const action = asset
        ? updateAssetAction(orgSlug, orgId, asset.id, undefined, formData)
        : createAssetAction(orgSlug, orgId, undefined, formData);
      const result = await action;
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
        {asset ? (
          <Button variant="ghost" size="icon-sm">
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" />
            Add asset
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{asset ? "Edit asset" : "Add asset"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={asset?.title} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select name="category" defaultValue={asset?.category ?? "OTHER"}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teamId">Team</Label>
              <Select name="teamId" defaultValue={asset?.teamId ?? "none"}>
                <SelectTrigger id="teamId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Whole org</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="file">File</Label>
            <input
              id="file"
              type="file"
              name="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,application/pdf,application/zip"
              required={!asset}
              className="w-full text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
            <p className="text-xs text-muted-foreground">
              {asset ? `Currently: ${asset.fileName}. Leave blank to keep it.` : "Image, PDF, or ZIP. Up to 20MB."}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={asset?.notes ?? ""} rows={2} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {asset ? "Save changes" : "Upload asset"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
