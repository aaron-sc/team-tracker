import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddRosterForm } from "@/components/teams/add-roster-form";
import { RemoveRosterButton } from "@/components/teams/remove-roster-button";
import { EditRosterEntryDialog } from "@/components/teams/edit-roster-entry-dialog";
import { addToRosterAction } from "@/lib/actions/teams";
import { Pencil, Star } from "lucide-react";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string }>;
}) {
  const { orgSlug, teamSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);

  const team = await prisma.team.findUnique({ where: { orgId_slug: { orgId: org.id, slug: teamSlug } } });
  if (!team) notFound();

  const [roster, allMembers] = await Promise.all([
    prisma.teamMembership.findMany({
      where: { teamId: team.id },
      include: { membership: { include: { user: true, role: true } } },
      orderBy: { joinedTeamAt: "asc" },
    }),
    prisma.membership.findMany({
      where: { orgId: org.id },
      include: { user: true, role: true },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const rosterMembershipIds = new Set(roster.map((r) => r.membershipId));
  const candidates = allMembers
    .filter((m) => !rosterMembershipIds.has(m.id))
    .map((m) => ({ membershipId: m.id, name: m.user.name, roleName: m.role.name }));

  const canManageRoster = membership.permissions.includes(Permission.roster_manage);
  const canEditTeam = membership.permissions.includes(Permission.team_edit);
  const addAction = addToRosterAction.bind(null, orgSlug, org.id, team.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{team.name}</h1>
          <p className="text-sm text-muted-foreground">{team.game}</p>
        </div>
        {canEditTeam ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${orgSlug}/teams/${team.slug}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>In-game name</TableHead>
                <TableHead>#</TableHead>
                <TableHead>Starter</TableHead>
                {canManageRoster ? <TableHead className="w-20" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Link
                      href={`/${orgSlug}/roster/${entry.membershipId}`}
                      className="font-medium hover:underline"
                    >
                      {entry.membership.user.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{entry.membership.role.name}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{entry.position ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.inGameName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.jerseyNumber ?? "—"}</TableCell>
                  <TableCell>{entry.isStarter ? <Star className="size-4 fill-primary text-primary" /> : null}</TableCell>
                  {canManageRoster ? (
                    <TableCell className="flex items-center gap-1">
                      <EditRosterEntryDialog
                        orgSlug={orgSlug}
                        orgId={org.id}
                        teamMembershipId={entry.id}
                        playerName={entry.membership.user.name}
                        defaultValues={{
                          position: entry.position ?? "",
                          jerseyNumber: entry.jerseyNumber ?? "",
                          inGameName: entry.inGameName ?? "",
                          isStarter: entry.isStarter,
                        }}
                      />
                      <RemoveRosterButton orgSlug={orgSlug} orgId={org.id} teamMembershipId={entry.id} />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
              {roster.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManageRoster ? 7 : 6} className="text-center text-muted-foreground">
                    No one on the roster yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManageRoster ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add to roster</CardTitle>
          </CardHeader>
          <CardContent>
            <AddRosterForm action={addAction} candidates={candidates} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
