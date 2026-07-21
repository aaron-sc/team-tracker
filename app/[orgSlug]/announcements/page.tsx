import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAnnouncementButton } from "@/components/announcements/delete-announcement-button";
import { Plus, Pin } from "lucide-react";

export default async function AnnouncementsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);

  const announcements = await prisma.announcement.findMany({
    where: { orgId: org.id },
    include: { author: { include: { user: true } }, team: true },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  const canCreate = membership.permissions.includes(Permission.announcement_create);
  const canDelete = membership.permissions.includes(Permission.announcement_delete);

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {announcements.length} announcement{announcements.length === 1 ? "" : "s"}
        </p>
        {canCreate ? (
          <Button size="sm" asChild>
            <Link href={`/${orgSlug}/announcements/new`}>
              <Plus className="size-4" />
              New announcement
            </Link>
          </Button>
        ) : null}
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">No announcements yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {a.pinned ? <Pin className="size-3.5 fill-primary text-primary" /> : null}
                    {a.title}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.author.user.name} · {a.createdAt.toLocaleDateString()}
                    {a.team ? (
                      <>
                        {" "}
                        · <Badge variant="outline">{a.team.name}</Badge>
                      </>
                    ) : (
                      " · Org-wide"
                    )}
                  </p>
                </div>
                {canDelete ? <DeleteAnnouncementButton orgSlug={orgSlug} orgId={org.id} announcementId={a.id} /> : null}
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
