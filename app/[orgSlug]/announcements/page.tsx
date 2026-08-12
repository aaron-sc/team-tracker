import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAnnouncementButton } from "@/components/announcements/delete-announcement-button";
import { BroadcastDialog } from "@/components/notifications/broadcast-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Pin, Megaphone } from "lucide-react";
import { formatDate } from "@/lib/utils/format-time";

export default async function AnnouncementsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { session, org, membership, teams } = await getOrgContext(orgSlug);
  const viewerTz = session.user.timezone ?? org.timezone;

  const announcements = await prisma.announcement.findMany({
    where: { orgId: org.id },
    include: { author: { include: { user: true } }, team: true },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  const canCreate = membership.permissions.includes(Permission.announcement_create);
  const canDelete = membership.permissions.includes(Permission.announcement_delete);
  const canBroadcast = membership.permissions.includes(Permission.notification_send_broadcast);

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {announcements.length} announcement{announcements.length === 1 ? "" : "s"}
        </p>
        <div className="flex gap-2">
          {canBroadcast ? <BroadcastDialog orgSlug={orgSlug} orgId={org.id} teams={teams} /> : null}
          {canCreate ? (
            <Button size="sm" asChild>
              <Link href={`/${orgSlug}/announcements/new`}>
                <Plus className="size-4" />
                New announcement
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={Megaphone} message="No announcements yet." />
          </CardContent>
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
                    {a.author.user.name} · {formatDate(a.createdAt, viewerTz)}
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
