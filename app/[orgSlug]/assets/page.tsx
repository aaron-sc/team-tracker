import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AssetDialog } from "@/components/assets/asset-dialog";
import { DeleteAssetButton } from "@/components/assets/delete-asset-button";
import { cn } from "@/lib/utils";
import { Images, Download } from "lucide-react";

const CATEGORY_LABEL: Record<string, string> = {
  BANNER: "Banner",
  MERCH: "Merch",
  GRAPHIC: "Graphic",
  LOGO: "Logo",
  TEMPLATE: "Template",
  OTHER: "Other",
};
const CATEGORY_CLASS: Record<string, string> = {
  BANNER: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  MERCH: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400",
  GRAPHIC: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  LOGO: "border-success/30 bg-success/10 text-success",
  TEMPLATE: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  OTHER: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export default async function AssetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { orgSlug } = await params;
  const { category } = await searchParams;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.asset_manage);

  const [assets, teams] = await Promise.all([
    prisma.asset.findMany({
      where: { orgId: org.id, ...(category ? { category: category as never } : {}) },
      orderBy: { createdAt: "desc" },
      include: { team: true, uploadedBy: { include: { user: true } } },
    }),
    prisma.team.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
  ]);

  const teamOptions = teams.map((t) => ({ id: t.id, name: t.name }));
  const categories = Object.keys(CATEGORY_LABEL);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {assets.length} asset{assets.length === 1 ? "" : "s"}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href={`/${orgSlug}/assets/export`} download>
              <Download className="size-4" />
              Export CSV
            </a>
          </Button>
          <AssetDialog orgSlug={orgSlug} orgId={org.id} teams={teamOptions} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link
          href={`/${orgSlug}/assets`}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium",
            !category ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
          )}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={`/${orgSlug}/assets?category=${c}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              category === c ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {CATEGORY_LABEL[c]}
          </Link>
        ))}
      </div>

      {assets.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={Images} message="No assets uploaded yet." />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {assets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden py-0">
              <a href={asset.fileUrl} target="_blank" rel="noreferrer" className="block">
                <div className="flex aspect-video items-center justify-center bg-muted">
                  {isImage(asset.mimeType) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.fileUrl} alt={asset.title} className="size-full object-cover" />
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      {asset.fileName.split(".").pop()?.toUpperCase()}
                    </span>
                  )}
                </div>
              </a>
              <CardContent className="space-y-2 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium" title={asset.title}>
                    {asset.title}
                  </p>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <AssetDialog
                      orgSlug={orgSlug}
                      orgId={org.id}
                      teams={teamOptions}
                      asset={{
                        id: asset.id,
                        title: asset.title,
                        category: asset.category,
                        teamId: asset.teamId,
                        notes: asset.notes,
                        fileName: asset.fileName,
                      }}
                    />
                    <DeleteAssetButton orgSlug={orgSlug} orgId={org.id} assetId={asset.id} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className={CATEGORY_CLASS[asset.category]}>
                    {CATEGORY_LABEL[asset.category]}
                  </Badge>
                  {asset.team ? (
                    <Badge variant="outline" className="text-muted-foreground">
                      {asset.team.name}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(asset.fileSize)}
                  {asset.uploadedBy ? ` · ${asset.uploadedBy.user.name}` : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
