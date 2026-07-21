import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function TeamAvailabilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ team?: string }>;
}) {
  const { orgSlug } = await params;
  const { team: teamId } = await searchParams;
  const { org, membership, teams } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.availability_manage_others);

  const activeTeamId = teamId ?? teams[0]?.id;

  const members = activeTeamId
    ? await prisma.membership.findMany({
        where: { orgId: org.id, teamMemberships: { some: { teamId: activeTeamId } } },
        include: { user: true, availabilityRules: { orderBy: { startTime: "asc" } } },
        orderBy: { user: { name: "asc" } },
      })
    : [];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {teams.map((t) => (
          <Link
            key={t.id}
            href={`/${orgSlug}/availability/team?team=${t.id}`}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm",
              t.id === activeTeamId ? "bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {t.name}
          </Link>
        ))}
      </div>

      {!activeTeamId ? (
        <p className="text-muted-foreground">Create a team first.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Player</TableHead>
                {DAYS.map((d) => (
                  <TableHead key={d}>{d}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    <Link href={`/${orgSlug}/roster/${m.id}`} className="hover:underline">
                      {m.user.name}
                    </Link>
                  </TableCell>
                  {DAYS.map((_, dayOfWeek) => {
                    const dayRules = m.availabilityRules.filter((r) => r.dayOfWeek === dayOfWeek);
                    return (
                      <TableCell key={dayOfWeek} className="text-xs text-muted-foreground">
                        {dayRules.length === 0
                          ? "—"
                          : dayRules.map((r) => `${r.startTime}-${r.endTime}`).join(", ")}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No one on this team&apos;s roster yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
