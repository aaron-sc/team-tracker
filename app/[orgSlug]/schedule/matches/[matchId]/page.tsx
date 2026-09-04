import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MatchResultForm } from "@/components/schedule/match-result-form";
import { DeleteMatchButton } from "@/components/schedule/delete-match-button";
import { DuplicateMatchButton } from "@/components/schedule/duplicate-match-button";
import { TeamPlaybookPanel } from "@/components/schedule/team-playbook-panel";
import { EventDiscussionPanel } from "@/components/schedule/event-discussion-panel";
import { recordMatchResultAction } from "@/lib/actions/matches";
import { postMatchCommentAction, deleteMatchCommentAction } from "@/lib/actions/match-comments";
import { venueDirectionsUrl } from "@/lib/utils/venue-directions";
import { formatDateTimeLong } from "@/lib/utils/format-time";
import { Calendar, MapPin, Radio, Pencil, Navigation, CalendarPlus } from "lucide-react";

const RESULT_VARIANT: Record<string, "default" | "destructive" | "secondary"> = {
  WIN: "default",
  LOSS: "destructive",
  DRAW: "secondary",
};

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; matchId: string }>;
}) {
  const { orgSlug, matchId } = await params;
  const { session, org, membership } = await getOrgContext(orgSlug);
  const viewerTz = session.user.timezone ?? org.timezone;
  const viewerHour12 = session.user.timeFormat !== "24h";

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { team: true, opponent: true, venue: true },
  });
  if (!match || match.team.orgId !== org.id) notFound();

  const canEdit = membership.permissions.includes(Permission.match_edit);
  const canDelete = membership.permissions.includes(Permission.match_delete);
  const canCreate = membership.permissions.includes(Permission.match_create);
  const canRecordResult = membership.permissions.includes(Permission.match_result_record);
  const resultAction = recordMatchResultAction.bind(null, orgSlug, org.id, match.id);

  // Playbook and discussion are scoped to this match's own team, same bar as the team page's
  // own strategy section — not the whole org.
  const isOnTeam = membership.teamIds.includes(match.teamId);
  const canViewTeamStuff = isOnTeam || canEdit;

  const [strategies, comments] = await Promise.all([
    canViewTeamStuff
      ? prisma.strategy.findMany({ where: { teamId: match.teamId }, orderBy: [{ map: "asc" }, { createdAt: "desc" }] })
      : Promise.resolve([]),
    canViewTeamStuff
      ? prisma.matchComment.findMany({
          where: { matchId: match.id },
          include: { membership: { include: { user: true } } },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
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
  const postCommentAction = postMatchCommentAction.bind(null, orgSlug, org.id, match.id);
  const deleteCommentAction = deleteMatchCommentAction.bind(null, orgSlug, org.id, match.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {match.team.name} vs {match.opponent.name}
          </h1>
          <p className="text-sm text-muted-foreground">{match.format}</p>
        </div>
        <div className="flex items-center gap-2">
          {match.resultStatus ? (
            <Badge variant={RESULT_VARIANT[match.resultStatus]}>
              {match.resultStatus} {match.scoreFor ?? "?"}–{match.scoreAgainst ?? "?"}
            </Badge>
          ) : (
            <Badge variant="outline">{match.status}</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            {formatDateTimeLong(match.scheduledAt, viewerTz, viewerHour12)}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-muted-foreground" />
            {match.locationType === "LAN" ? match.venue?.name ?? "LAN (venue TBD)" : "Online"}
            {match.locationType === "LAN" && match.venue && venueDirectionsUrl(match.venue) ? (
              <a
                href={venueDirectionsUrl(match.venue)!}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-primary underline underline-offset-4"
              >
                <Navigation className="size-3.5" />
                directions
              </a>
            ) : null}
          </div>
          {match.isStreamed ? (
            <div className="flex items-center gap-2">
              <Radio className="size-4 text-muted-foreground" />
              {match.streamPlatform ?? "Streamed"}
              {match.streamUrl ? (
                <a href={match.streamUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
                  watch
                </a>
              ) : null}
              {match.casterName ? <span className="text-muted-foreground">· cast by {match.casterName}</span> : null}
            </div>
          ) : null}
          {match.notes ? <p className="whitespace-pre-wrap text-muted-foreground">{match.notes}</p> : null}
        </CardContent>
      </Card>

      {canRecordResult ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Result</CardTitle>
          </CardHeader>
          <CardContent>
            <MatchResultForm
              action={resultAction}
              defaultValues={{
                status: match.status,
                resultStatus: match.resultStatus,
                scoreFor: match.scoreFor,
                scoreAgainst: match.scoreAgainst,
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      {canViewTeamStuff ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team playbook</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamPlaybookPanel orgSlug={orgSlug} teamSlug={match.team.slug} strategies={strategyItems} />
          </CardContent>
        </Card>
      ) : null}

      {canViewTeamStuff ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Discussion</CardTitle>
          </CardHeader>
          <CardContent>
            <EventDiscussionPanel
              comments={commentItems}
              currentMembershipId={membership.membershipId}
              canPost={canViewTeamStuff}
              canModerate={canEdit}
              onPost={postCommentAction}
              onDelete={deleteCommentAction}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={`/${orgSlug}/schedule/matches/${match.id}/ics`} download>
            <CalendarPlus className="size-4" />
            Add to calendar
          </a>
        </Button>
        {canCreate ? <DuplicateMatchButton orgSlug={orgSlug} orgId={org.id} matchId={match.id} /> : null}
        {canEdit ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${orgSlug}/schedule/matches/${match.id}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
        ) : null}
        {canDelete ? <DeleteMatchButton orgSlug={orgSlug} orgId={org.id} matchId={match.id} /> : null}
      </div>
    </div>
  );
}
