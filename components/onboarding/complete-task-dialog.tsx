"use client";

import { useState, useTransition } from "react";
import { completeOnboardingTaskAction } from "@/lib/actions/onboarding";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Loader2, FileText, Link2, Video, PenLine, ClipboardCheck } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  type: "ACKNOWLEDGE" | "DOCUMENT" | "LINK" | "VIDEO" | "SIGNATURE";
  url: string | null;
  body: string | null;
  required: boolean;
};

type Completion = { completedAt: string; signatureName: string | null; signedSnapshot: string | null } | null;

const TYPE_ICON = { ACKNOWLEDGE: ClipboardCheck, DOCUMENT: FileText, LINK: Link2, VIDEO: Video, SIGNATURE: PenLine };
const TYPE_LABEL = { ACKNOWLEDGE: "Acknowledge", DOCUMENT: "Read", LINK: "Visit link", VIDEO: "Watch video", SIGNATURE: "Sign" };

export function CompleteTaskDialog({
  orgSlug,
  orgId,
  task,
  completion,
}: {
  orgSlug: string;
  orgId: string;
  task: Task;
  completion: Completion;
}) {
  const [open, setOpen] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [visited, setVisited] = useState(false);
  const [pending, startTransition] = useTransition();

  const Icon = TYPE_ICON[task.type];
  const isComplete = completion !== null;

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await completeOnboardingTaskAction(orgSlug, orgId, task.id, undefined, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(result?.success ?? "Done.");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isComplete ? "outline" : "default"} size="sm">
          {isComplete ? (
            <>
              <CheckCircle2 className="size-4 text-emerald-600" />
              Completed
            </>
          ) : (
            <>
              <Icon className="size-4" />
              {TYPE_LABEL[task.type]}
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task.title}
            {task.required ? <Badge variant="secondary">Required</Badge> : <Badge variant="outline">Optional</Badge>}
          </DialogTitle>
        </DialogHeader>

        {task.description ? <p className="text-sm text-muted-foreground">{task.description}</p> : null}

        {isComplete ? (
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 className="size-4" />
              Completed {new Date(completion.completedAt).toLocaleDateString()}
            </p>
            {task.type === "SIGNATURE" && completion.signatureName ? (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Signed by</p>
                <p className="text-lg italic" style={{ fontFamily: "'Brush Script MT', cursive" }}>
                  {completion.signatureName}
                </p>
                {completion.signedSnapshot ? (
                  <p className="max-h-40 overflow-y-auto whitespace-pre-wrap border-t pt-2 text-xs text-muted-foreground">
                    {completion.signedSnapshot}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {task.type === "DOCUMENT" ? (
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3 text-sm">
                {task.body ? <p className="whitespace-pre-wrap">{task.body}</p> : null}
                {task.url ? (
                  <a
                    href={task.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-primary underline underline-offset-4"
                  >
                    <ExternalLink className="size-3.5" />
                    Open document
                  </a>
                ) : null}
              </div>
            ) : null}

            {(task.type === "LINK" || task.type === "VIDEO") && task.url ? (
              <a
                href={task.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => setVisited(true)}
                className="flex items-center gap-2 rounded-md border p-3 text-sm text-primary underline underline-offset-4"
              >
                <ExternalLink className="size-4" />
                {task.type === "VIDEO" ? "Watch video" : "Open link"}
              </a>
            ) : null}

            {task.type === "SIGNATURE" ? (
              <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border p-3 text-sm">{task.body}</div>
            ) : null}

            <form action={submit} className="space-y-3">
              {task.type === "SIGNATURE" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="signatureName">Type your full name to sign</Label>
                  <Input
                    id="signatureName"
                    name="signatureName"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="Jane Doe"
                    className="text-lg italic"
                    style={{ fontFamily: "'Brush Script MT', cursive" }}
                    autoComplete="off"
                  />
                </div>
              ) : null}
              <Button
                type="submit"
                disabled={
                  pending ||
                  (task.type === "SIGNATURE" && signatureName.trim().length === 0) ||
                  ((task.type === "LINK" || task.type === "VIDEO") && !visited)
                }
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                {task.type === "SIGNATURE" ? "Sign" : "Mark complete"}
              </Button>
              {(task.type === "LINK" || task.type === "VIDEO") && !visited ? (
                <p className="text-xs text-muted-foreground">Open the link above first.</p>
              ) : null}
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
