"use client";

import { useState, useTransition } from "react";
import { createOnboardingTaskAction, updateOnboardingTaskAction } from "@/lib/actions/onboarding";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Loader2 } from "lucide-react";

type TaskType = "ACKNOWLEDGE" | "DOCUMENT" | "LINK" | "VIDEO" | "SIGNATURE";

const TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: "ACKNOWLEDGE", label: "Simple acknowledgement" },
  { value: "DOCUMENT", label: "Read a document" },
  { value: "LINK", label: "Visit a link" },
  { value: "VIDEO", label: "Watch a video" },
  { value: "SIGNATURE", label: "Sign a document (e-signature)" },
];

type Defaults = {
  title?: string;
  description?: string;
  type?: TaskType;
  url?: string;
  body?: string;
  required?: boolean;
  fileName?: string | null;
  roleId?: string | null;
  excludedMembershipIds?: string[];
};

export function TaskFormDialog({
  orgSlug,
  orgId,
  taskId,
  defaultValues,
  roles,
  members,
}: {
  orgSlug: string;
  orgId: string;
  taskId?: string;
  defaultValues?: Defaults;
  roles: { id: string; name: string }[];
  members: { id: string; name: string }[];
}) {
  const isEdit = !!taskId;
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TaskType>(defaultValues?.type ?? "ACKNOWLEDGE");
  const [required, setRequired] = useState(defaultValues?.required ?? true);
  const [roleId, setRoleId] = useState(defaultValues?.roleId ?? "__all__");
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set(defaultValues?.excludedMembershipIds ?? []));
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = isEdit
        ? await updateOnboardingTaskAction(orgSlug, orgId, taskId, undefined, formData)
        : await createOnboardingTaskAction(orgSlug, orgId, undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        toast.success(result?.success ?? "Saved.");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(undefined);
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon-sm">
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" />
            Add task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "Add onboarding task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={defaultValues?.title} required maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" name="description" defaultValue={defaultValues?.description} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <Select name="type" value={type} onValueChange={(v) => setType(v as TaskType)}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "LINK" || type === "VIDEO" ? (
            <div className="space-y-1.5">
              <Label htmlFor="url">{type === "VIDEO" ? "Video URL" : "Link URL"}</Label>
              <Input id="url" name="url" type="url" defaultValue={defaultValues?.url} placeholder="https://…" required />
            </div>
          ) : null}

          {type === "DOCUMENT" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="body">Document text (optional)</Label>
                <Textarea id="body" name="body" defaultValue={defaultValues?.body} rows={6} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="url">Or a link to the document (optional)</Label>
                <Input id="url" name="url" type="url" defaultValue={defaultValues?.url} placeholder="https://…" />
              </div>
            </>
          ) : null}

          {type === "SIGNATURE" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="body">Document text to sign (optional if a file is attached)</Label>
                <Textarea id="body" name="body" defaultValue={defaultValues?.body} rows={6} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="file">Attach a file to sign (PDF, Word, or text — optional)</Label>
                <Input id="file" name="file" type="file" accept=".pdf,.doc,.docx,.txt" />
                {defaultValues?.fileName ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Current file: {defaultValues.fileName}</span>
                    <Label htmlFor="removeFile" className="flex cursor-pointer items-center gap-1.5 font-normal">
                      <Checkbox id="removeFile" name="removeFile" className="size-3.5" />
                      Remove
                    </Label>
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Uploading a new file replaces the current one. People sign a permanent snapshot of whatever file is
                  attached at the moment they sign — later replacing it doesn&apos;t change what past signers agreed to.
                </p>
              </div>
            </>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="roleId">Applies to</Label>
            <Select name="roleId" value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="roleId" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Everyone (all roles)</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} only
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {members.length > 0 ? (
            <div className="space-y-1.5">
              <Label>Exclude specific members (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Checked members won&apos;t see or need to complete this task, even if it applies to their role.
              </p>
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border p-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`exclude-${m.id}`}
                      name="excludedMembershipIds"
                      value={m.id}
                      checked={excludedIds.has(m.id)}
                      onCheckedChange={(value) => {
                        setExcludedIds((prev) => {
                          const next = new Set(prev);
                          if (value) next.add(m.id);
                          else next.delete(m.id);
                          return next;
                        });
                      }}
                    />
                    <Label htmlFor={`exclude-${m.id}`} className="cursor-pointer text-sm font-normal">
                      {m.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Checkbox id="required" name="required" checked={required} onCheckedChange={(v) => setRequired(!!v)} />
            <Label htmlFor="required" className="cursor-pointer font-normal">
              Required to access the rest of the org
            </Label>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEdit ? "Save" : "Add task"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
