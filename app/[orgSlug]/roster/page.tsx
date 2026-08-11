import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function RosterPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org } = await getOrgContext(orgSlug);

  const members = await prisma.membership.findMany({
    where: { orgId: org.id },
    include: { user: true, role: true, teamMemberships: { include: { team: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {members.length} member{members.length === 1 ? "" : "s"} in the organization
        </p>
        <Button size="sm" variant="outline" asChild>
          <a href={`/${orgSlug}/roster/export`} download>
            <Download className="size-4" />
            Export CSV
          </a>
        </Button>
      </div>
      <div className="space-y-2">
        {members.map((m) => (
          <Link key={m.id} href={`/${orgSlug}/roster/${m.id}`}>
            <Card className="transition-colors hover:bg-accent">
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback>{initials(m.user.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <Badge variant="secondary">{m.role.name}</Badge>
                  {m.teamMemberships.map((tm) => (
                    <Badge key={tm.id} variant="outline">
                      {tm.team.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
