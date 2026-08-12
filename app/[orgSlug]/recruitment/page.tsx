import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StageSelect } from "@/components/recruitment/stage-select";
import { Plus, Settings2, Download, Mail, MessageCircle } from "lucide-react";
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

  const [levels, prospects] = await Promise.all([
    prisma.prospectLevel.findMany({ where: { orgId: org.id }, orderBy: { order: "asc" } }),
    prisma.recruitmentProspect.findMany({
      where: { orgId: org.id, ...(level ? { levelId: level } : {}) },
      include: { level: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

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
          {levels.map((lvl) => (
            <Link
              key={lvl.id}
              href={`/${orgSlug}/recruitment?level=${lvl.id}`}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm",
                level === lvl.id ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              {lvl.name}
            </Link>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href={`/${orgSlug}/recruitment/export`} download>
              <Download className="size-4" />
              Export CSV
            </a>
          </Button>
          {canManage ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/${orgSlug}/recruitment/levels`}>
                <Settings2 className="size-4" />
                Levels
              </Link>
            </Button>
          ) : null}
          {canManage ? (
            <Button size="sm" asChild>
              <Link href={`/${orgSlug}/recruitment/new`}>
                <Plus className="size-4" />
                New prospect
              </Link>
            </Button>
          ) : null}
        </div>
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
                      {p.level ? (
                        <Badge variant="secondary" className="text-xs">
                          {p.level.name}
                        </Badge>
                      ) : null}
                      <span>{p.game}</span>
                    </div>
                    {p.email || p.discordHandle ? (
                      <div className="flex items-center gap-2.5">
                        {p.email ? (
                          <a
                            href={`mailto:${p.email}`}
                            title={p.email}
                            className="flex items-center gap-1 hover:text-foreground"
                          >
                            <Mail className="size-3.5" />
                            Email
                          </a>
                        ) : null}
                        {p.discordHandle ? (
                          <span className="flex items-center gap-1" title={p.discordHandle}>
                            <MessageCircle className="size-3.5" />
                            {p.discordHandle}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
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
