import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { ProspectLevel } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StageSelect } from "@/components/recruitment/stage-select";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = ["SCOUTING", "CONTACTED", "TRYOUT", "OFFER", "SIGNED", "PASSED"] as const;
const STAGE_LABELS: Record<string, string> = {
  SCOUTING: "Scouting",
  CONTACTED: "Contacted",
  TRYOUT: "Tryout",
  OFFER: "Offer",
  SIGNED: "Signed",
  PASSED: "Passed",
};
const LEVEL_LABELS: Record<string, string> = {
  HIGH_SCHOOL: "HS",
  COLLEGE: "College",
  PRO: "Pro",
};

export default async function RecruitmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ level?: string }>;
}) {
  const { orgSlug } = await params;
  const { level } = await searchParams;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.recruitment_view);

  const canManage = membership.permissions.includes(Permission.recruitment_manage);
  const levelFilter = level && level in ProspectLevel ? (level as ProspectLevel) : undefined;

  const prospects = await prisma.recruitmentProspect.findMany({
    where: { orgId: org.id, ...(levelFilter ? { level: levelFilter } : {}) },
    orderBy: { updatedAt: "desc" },
  });

  const columns = STAGES.map((stage) => ({
    stage,
    prospects: prospects.filter((p) => p.stage === stage),
  }));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <Link
            href={`/${orgSlug}/recruitment`}
            className={cn("rounded-md border px-3 py-1.5 text-sm", !level ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
          >
            All levels
          </Link>
          {Object.entries(LEVEL_LABELS).map(([value, label]) => (
            <Link
              key={value}
              href={`/${orgSlug}/recruitment?level=${value}`}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm",
                level === value ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              {label}
            </Link>
          ))}
        </div>
        {canManage ? (
          <Button size="sm" asChild>
            <Link href={`/${orgSlug}/recruitment/new`}>
              <Plus className="size-4" />
              New prospect
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {columns.map((col) => (
          <div key={col.stage}>
            <h3 className="mb-2 flex items-center justify-between text-sm font-semibold text-muted-foreground">
              {STAGE_LABELS[col.stage]}
              <Badge variant="outline">{col.prospects.length}</Badge>
            </h3>
            <div className="space-y-2">
              {col.prospects.map((p) => (
                <Card key={p.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      <Link href={`/${orgSlug}/recruitment/${p.id}`} className="hover:underline">
                        {p.name}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pb-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {LEVEL_LABELS[p.level]}
                      </Badge>
                      <span>{p.game}</span>
                    </div>
                    {canManage ? (
                      <StageSelect orgSlug={orgSlug} orgId={org.id} prospectId={p.id} stage={p.stage} />
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
