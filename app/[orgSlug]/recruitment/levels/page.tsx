import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { ProspectLevelForm } from "@/components/recruitment/prospect-level-form";
import { ProspectLevelRow } from "@/components/recruitment/prospect-level-row";
import { ArrowLeft } from "lucide-react";

export default async function ProspectLevelsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.recruitment_manage);

  const levels = await prisma.prospectLevel.findMany({
    where: { orgId: org.id },
    include: { _count: { select: { prospects: true } } },
    orderBy: { order: "asc" },
  });

  return (
    <div className="max-w-xl">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/${orgSlug}/recruitment`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">Recruitment levels</h1>
          <p className="text-sm text-muted-foreground">
            Custom to this org — rename, remove, or add as many as you need.
          </p>
        </div>
      </div>

      <div className="mb-4">
        <ProspectLevelForm orgSlug={orgSlug} orgId={org.id} />
      </div>

      {levels.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No levels yet. Prospects can still be created without one, or add a level above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {levels.map((level) => (
            <ProspectLevelRow
              key={level.id}
              orgSlug={orgSlug}
              orgId={org.id}
              level={{ id: level.id, name: level.name, prospectCount: level._count.prospects }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
