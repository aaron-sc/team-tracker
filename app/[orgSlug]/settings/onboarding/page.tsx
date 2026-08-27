import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskFormDialog } from "@/components/onboarding/task-form-dialog";
import { TaskRow } from "@/components/onboarding/task-row";
import { EmptyState } from "@/components/ui/empty-state";
import { ClipboardList, History } from "lucide-react";

export default async function OnboardingSettingsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.onboarding_manage);

  const tasks = await prisma.onboardingTask.findMany({
    where: { orgId: org.id },
    include: { _count: { select: { completions: true } } },
    orderBy: { order: "asc" },
  });

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Onboarding tasks</h1>
          <p className="text-sm text-muted-foreground">
            Required tasks block access to the rest of the org until every active member completes them.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${orgSlug}/settings/onboarding/records`}>
              <History className="size-4" />
              View records
            </Link>
          </Button>
          <TaskFormDialog orgSlug={orgSlug} orgId={org.id} />
        </div>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={ClipboardList} message="No onboarding tasks yet — add one above." />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              orgSlug={orgSlug}
              orgId={org.id}
              task={{
                id: task.id,
                title: task.title,
                description: task.description,
                type: task.type,
                url: task.url,
                body: task.body,
                fileUrl: task.fileUrl,
                fileName: task.fileName,
                required: task.required,
                active: task.active,
                completionCount: task._count.completions,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
