import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompleteTaskDialog } from "@/components/onboarding/complete-task-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ClipboardList, Settings2 } from "lucide-react";

export default async function OnboardingPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  const canManage = membership.permissions.includes(Permission.onboarding_manage);

  const tasks = await prisma.onboardingTask.findMany({
    where: { orgId: org.id, active: true },
    include: { completions: { where: { membershipId: membership.membershipId } } },
    orderBy: { order: "asc" },
  });

  const requiredTasks = tasks.filter((t) => t.required);
  const completedRequired = requiredTasks.filter((t) => t.completions.length > 0);
  const allRequiredDone = completedRequired.length === requiredTasks.length;

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Onboarding</h1>
          <p className="text-sm text-muted-foreground">
            {requiredTasks.length > 0
              ? `${completedRequired.length} of ${requiredTasks.length} required task${requiredTasks.length === 1 ? "" : "s"} complete`
              : "No required tasks right now."}
          </p>
        </div>
        {canManage ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${orgSlug}/settings/onboarding`}>
              <Settings2 className="size-4" />
              Manage tasks
            </Link>
          </Button>
        ) : null}
      </div>

      {!allRequiredDone ? (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="py-3 text-sm">
            Complete the required tasks below to unlock the rest of the org.
          </CardContent>
        </Card>
      ) : null}

      {tasks.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={ClipboardList} message="No onboarding tasks yet." />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0 py-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {task.title}
                    {task.required ? (
                      <Badge variant="secondary">Required</Badge>
                    ) : (
                      <Badge variant="outline">Optional</Badge>
                    )}
                  </CardTitle>
                  {task.description ? <p className="mt-1 text-sm text-muted-foreground">{task.description}</p> : null}
                </div>
                <CompleteTaskDialog
                  orgSlug={orgSlug}
                  orgId={org.id}
                  task={{
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    type: task.type,
                    url: task.url,
                    body: task.body,
                    required: task.required,
                  }}
                  completion={
                    task.completions[0]
                      ? {
                          completedAt: task.completions[0].completedAt.toISOString(),
                          signatureName: task.completions[0].signatureName,
                          signedSnapshot: task.completions[0].signedSnapshot,
                        }
                      : null
                  }
                />
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
