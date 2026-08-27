"use client";

import { useTransition } from "react";
import { deleteOnboardingTaskAction, setOnboardingTaskActiveAction } from "@/lib/actions/onboarding";
import { TaskFormDialog } from "@/components/onboarding/task-form-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, FileText, Link2, Video, PenLine, ClipboardCheck, Paperclip } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  type: "ACKNOWLEDGE" | "DOCUMENT" | "LINK" | "VIDEO" | "SIGNATURE";
  url: string | null;
  body: string | null;
  fileUrl: string | null;
  fileName: string | null;
  required: boolean;
  active: boolean;
  completionCount: number;
};

const TYPE_ICON = { ACKNOWLEDGE: ClipboardCheck, DOCUMENT: FileText, LINK: Link2, VIDEO: Video, SIGNATURE: PenLine };

export function TaskRow({ orgSlug, orgId, task }: { orgSlug: string; orgId: string; task: Task }) {
  const [pending, startTransition] = useTransition();
  const Icon = TYPE_ICON[task.type];

  return (
    <Card className={task.active ? undefined : "opacity-60"}>
      <CardContent className="flex items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-sm font-medium">
              {task.title}
              {task.required ? <Badge variant="secondary">Required</Badge> : <Badge variant="outline">Optional</Badge>}
              {!task.active ? <Badge variant="outline">Inactive</Badge> : null}
            </p>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{task.completionCount} completed</span>
              {task.fileUrl ? (
                <a
                  href={`/api/onboarding/tasks/${task.id}/file`}
                  className="flex items-center gap-1 text-primary underline underline-offset-4"
                >
                  <Paperclip className="size-3" />
                  {task.fileName ?? "attached file"}
                </a>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await setOnboardingTaskActiveAction(orgSlug, orgId, task.id, !task.active);
                if (result?.error) toast.error(result.error);
              });
            }}
          >
            {task.active ? "Deactivate" : "Activate"}
          </Button>
          <TaskFormDialog
            orgSlug={orgSlug}
            orgId={orgId}
            taskId={task.id}
            defaultValues={{
              title: task.title,
              description: task.description ?? "",
              type: task.type,
              url: task.url ?? "",
              body: task.body ?? "",
              required: task.required,
              fileName: task.fileName,
            }}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Delete "${task.title}"? This also removes everyone's completion record for it.`)) return;
              startTransition(async () => {
                const result = await deleteOnboardingTaskAction(orgSlug, orgId, task.id);
                if (result?.error) toast.error(result.error);
              });
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
