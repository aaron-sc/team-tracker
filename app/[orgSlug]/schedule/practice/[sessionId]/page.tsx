import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/org/context";
import { canSeeTeam } from "@/lib/auth/authorize";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AttendanceStatusSelect } from "@/components/schedule/attendance-status-select";
import { AddAttendeeControl } from "@/components/schedule/add-attendee-control";
import { RemoveAttendeeButton } from "@/components/schedule/remove-attendee-button";
import { addSessionAttendeeAction, removeSessionAttendeeAction } from "@/lib/actions/practice-sessions";
import { DeletePracticeButton } from "@/components/schedule/delete-practice-button";
import { DuplicatePracticeButton } from "@/components/schedule/duplicate-practice-button";
import { TeamPlaybookPanel } from "@/components/schedule/team-playbook-panel";
import { EventDiscussionPanel } from "@/components/schedule/event-discussion-panel";
import { postPracticeCommentAction, deletePracticeCommentAction } from "@/lib/actions/practice-comments";
import { getConflictsForSession } from "@/lib/availability/conflicts";
import { venueDirectionsUrl } from "@/lib/utils/venue-directions";
import { formatDateTimeLong } from "@/lib/utils/format-time";
import { RefreshOnMount } from "@/components/ui/refresh-on-mount";
import { Calendar, MapPin, Clock, Pencil, AlertTriangle, Navigation, CalendarPlus } from "lucide-react";

export default async function PracticeSessionDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; sessionId: string }>;
}) {
  const { orgSlug, sessionId } = await params;
  const { session: authSession, org, membership } = await getOrgContext(orgSlug);
  const viewerTz = authSession.user.timezone ?? org.timezone;
  const viewerHour12 = authSession.user.timeFormat !== "24h";

  const session = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
    include: {
      team: true,
      opponent: true,
      venue: true,
      attendances: { include: { membership: { include: { user: true } } } },
    },
  });
  if (!session || session.team.orgId !== org.id || !canSeeTeam(membership, session.teamId)) notFound();

  const canEdit = membership.permissions.includes(Permission.practice_edit);
  const canDelete = membership.permissions.includes(Permission.practice_delete);
  const canCreate = membership.permissions.includes(Permission.practice_create);
  const canManageAttendance = membership.permissions.includes(Permission.attendance_manage);

  const conflicts = await getConflictsForSession(session);

  const roster = canManageAttendance
    ? await prisma.teamMembership.findMany({
        where: { teamId: session.teamId },
        include: { membership: { include: { user: true } } },
        orderBy: { membership: { user: { name: "asc" } } },
      })
    : [];
  const attendingIds = new Set(session.attendances.map((a) => a.membershipId));
  const addCandidates = roster
    .filter((r) => !attendingIds.has(r.membershipId))
    .map((r) => ({ membershipId: r.membershipId, name: r.membership.user.name }));
  const addAttendeeAction = addSessionAttendeeAction.bind(null, orgSlug, org.id, session.id);

  const [strategies, comments] = await Promise.all([
    prisma.strategy.findMany({ where: { teamId: session.teamId }, orderBy: [{ map: "asc" }, { createdAt: "desc" }] }),
    prisma.practiceComment.findMany({
      where: { sessionId: session.id },
      include: { membership: { include: { user: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const strategyItems = strategies.map((s) => ({
    id: s.id,
    map: s.map,
    title: s.title,
    notes: s.notes,
    agents: s.agents as { role: string; agent: string }[] | null,
  }));
  const commentItems = comments.map((c) => ({
    id: c.id,
    body: c.body,
    authorName: c.membership.user.name,
    membershipId: c.membershipId,
    createdAt: c.createdAt.toISOString(),
  }));
  const postCommentAction = postPracticeCommentAction.bind(null, orgSlug, org.id, session.id);
  const deleteCommentAction = deletePracticeCommentAction.bind(null, orgSlug, org.id, session.id);

  return (
    <div className="max-w-2xl space-y-6">
      <RefreshOnMount />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {session.team.name} {session.type === "SCRIM" ? `vs ${session.opponent?.name}` : "Practice"}
          </h1>
          <Badge variant="outline">{session.type}</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            {formatDateTimeLong(session.scheduledAt, viewerTz, viewerHour12)}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            {session.durationMinutes} minutes
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-muted-foreground" />
            {session.locationType === "LAN" ? session.venue?.name ?? "LAN (venue TBD)" : "Online"}
            {session.locationType === "LAN" && session.venue && venueDirectionsUrl(session.venue) ? (
              <a
                href={venueDirectionsUrl(session.venue)!}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-primary underline underline-offset-4"
              >
                <Navigation className="size-3.5" />
                directions
              </a>
            ) : null}
          </div>
          {session.notes ? <p className="whitespace-pre-wrap text-muted-foreground">{session.notes}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Attendance
            {conflicts.size > 0 ? (
              <span className="flex items-center gap-1 text-xs font-normal text-amber-600">
                <AlertTriangle className="size-3.5" />
                {conflicts.size} conflict{conflicts.size === 1 ? "" : "s"} with stated availability
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
                {canManageAttendance ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {session.attendances.map((a) => {
                const isSelf = a.membershipId === membership.membershipId;
                const mode = canManageAttendance ? "manage" : isSelf ? "self" : null;
                return (
                  <TableRow key={a.id}>
                    <TableCell>{a.membership.user.name}</TableCell>
                    <TableCell>
                      {mode ? (
                        <AttendanceStatusSelect
                          orgSlug={orgSlug}
                          orgId={org.id}
                          attendanceId={a.id}
                          status={a.status}
                          mode={mode}
                          kind="practice"
                        />
                      ) : (
                        <Badge variant="secondary">{a.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {conflicts.has(a.membershipId) ? (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <AlertTriangle className="size-3.5" />
                          Unavailable
                        </span>
                      ) : null}
                    </TableCell>
                    {canManageAttendance ? (
                      <TableCell>
                        <RemoveAttendeeButton onRemove={removeSessionAttendeeAction.bind(null, orgSlug, org.id, a.id)} />
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
              {session.attendances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManageAttendance ? 4 : 3} className="text-center text-muted-foreground">
                    No one on the roster for this team yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          {canManageAttendance ? <AddAttendeeControl candidates={addCandidates} onAdd={addAttendeeAction} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team playbook</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamPlaybookPanel orgSlug={orgSlug} strategies={strategyItems} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Discussion</CardTitle>
        </CardHeader>
        <CardContent>
          <EventDiscussionPanel
            comments={commentItems}
            currentMembershipId={membership.membershipId}
            canPost
            canModerate={canEdit}
            onPost={postCommentAction}
            onDelete={deleteCommentAction}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={`/${orgSlug}/schedule/practice/${session.id}/ics`} download>
            <CalendarPlus className="size-4" />
            Add to calendar
          </a>
        </Button>
        {canCreate ? <DuplicatePracticeButton orgSlug={orgSlug} orgId={org.id} sessionId={session.id} /> : null}
        {canEdit ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${orgSlug}/schedule/practice/${session.id}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
        ) : null}
        {canDelete ? <DeletePracticeButton orgSlug={orgSlug} orgId={org.id} sessionId={session.id} /> : null}
      </div>
    </div>
  );
}
