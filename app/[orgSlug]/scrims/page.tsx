import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { getPartnerOrgIds, cancelScrimListingAction, withdrawScrimRequestAction, acceptScrimRequestAction, declineScrimRequestAction } from "@/lib/actions/scrims";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrimQuickActionButton } from "@/components/scrims/scrim-quick-action-button";
import { ScrimRequestDialog } from "@/components/scrims/scrim-request-dialog";
import { formatDateTime } from "@/lib/utils/format-time";
import { SITE_URL } from "@/lib/utils/site-url";
import { Plus, MapPin, Gauge, Check, X, ExternalLink } from "lucide-react";

export default async function ScrimsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { session, org, membership, teams } = await getOrgContext(orgSlug);
  const viewerTz = session.user.timezone ?? org.timezone;
  const viewerHour12 = session.user.timeFormat !== "24h";
  const canManage = membership.permissions.includes(Permission.scrim_manage);
  const now = new Date();

  const partnerOrgIds = await getPartnerOrgIds(org.id);

  const [board, myListings, myRequests] = await Promise.all([
    prisma.scrimListing.findMany({
      where: {
        status: "OPEN",
        proposedStart: { gte: now },
        orgId: { not: org.id },
        OR: [{ visibility: "OPEN" }, { visibility: "PARTNERS_ONLY", orgId: { in: partnerOrgIds } }],
      },
      include: { org: true, team: { select: { id: true, name: true, game: true, publicRosterEnabled: true, publicRosterToken: true } } },
      orderBy: { proposedStart: "asc" },
      take: 30,
    }),
    canManage
      ? prisma.scrimListing.findMany({
          where: { orgId: org.id },
          include: {
            team: true,
            requests: { include: { requestingOrg: true, requestingTeam: true }, orderBy: { createdAt: "desc" } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
    canManage
      ? prisma.scrimRequest.findMany({
          where: { requestingOrgId: org.id },
          include: { listing: { include: { org: true, team: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const boardContent = (
    <div className="space-y-3">
      {board.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No open scrim listings right now{teams.length > 0 ? " — be the first to post one." : "."}
        </p>
      ) : (
        board.map((listing) => (
          <Card key={listing.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-medium">
                  {listing.org.name} — {listing.team.name}
                  <Badge variant="secondary" className="ml-2">
                    {listing.game}
                  </Badge>
                  {listing.visibility === "PARTNERS_ONLY" ? (
                    <Badge variant="outline" className="ml-1.5">
                      Partners
                    </Badge>
                  ) : null}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDateTime(listing.proposedStart, viewerTz, viewerHour12)} · {listing.format}
                  {listing.region ? (
                    <>
                      {" "}
                      · <MapPin className="inline size-3" /> {listing.region}
                    </>
                  ) : null}
                  {listing.skillTier ? (
                    <>
                      {" "}
                      · <Gauge className="inline size-3" /> {listing.skillTier}
                    </>
                  ) : null}
                </p>
                {listing.notes ? <p className="mt-1 text-sm">{listing.notes}</p> : null}
                {listing.team.publicRosterEnabled && listing.team.publicRosterToken ? (
                  <a
                    href={`${SITE_URL}/embed/roster/${listing.team.publicRosterToken}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 flex items-center gap-1 text-xs text-primary underline underline-offset-4"
                  >
                    <ExternalLink className="size-3" />
                    View public roster
                  </a>
                ) : null}
              </div>
              {canManage && teams.length > 0 ? (
                <ScrimRequestDialog
                  orgSlug={orgSlug}
                  orgId={org.id}
                  listingId={listing.id}
                  listingLabel={`${listing.org.name} — ${listing.team.name}`}
                  teams={teams}
                />
              ) : null}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  if (!canManage) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Scrim finder</h1>
          <p className="text-muted-foreground">Other organizations looking for a scrim right now.</p>
        </div>
        {boardContent}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Scrim finder</h1>
          <p className="text-muted-foreground">Post a listing, get matched, and it lands on both calendars automatically.</p>
        </div>
        <Button asChild>
          <Link href={`/${orgSlug}/scrims/new`}>
            <Plus className="size-4" />
            Post a listing
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">Open board</TabsTrigger>
          <TabsTrigger value="mine">Your listings ({myListings.length})</TabsTrigger>
          <TabsTrigger value="sent">Requests sent ({myRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-4">
          {boardContent}
        </TabsContent>

        <TabsContent value="mine" className="mt-4 space-y-3">
          {myListings.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven&apos;t posted a scrim listing yet.</p>
          ) : (
            myListings.map((listing) => {
              const pending = listing.requests.filter((r) => r.status === "PENDING");
              return (
                <Card key={listing.id}>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base">
                      {listing.team.name}
                      <Badge variant="secondary" className="ml-2">
                        {listing.status}
                      </Badge>
                    </CardTitle>
                    {listing.status === "OPEN" ? (
                      <ScrimQuickActionButton
                        variant="ghost"
                        action={cancelScrimListingAction.bind(null, orgSlug, org.id, listing.id)}
                        successMessage="Listing cancelled."
                      >
                        Cancel
                      </ScrimQuickActionButton>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(listing.proposedStart, viewerTz, viewerHour12)} · {listing.format}
                      {listing.region ? ` · ${listing.region}` : ""}
                    </p>
                    {pending.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No requests yet.</p>
                    ) : (
                      pending.map((req) => (
                        <div key={req.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
                          <div>
                            <p className="font-medium">
                              {req.requestingOrg.name} — {req.requestingTeam.name}
                            </p>
                            {req.message ? <p className="text-muted-foreground">{req.message}</p> : null}
                          </div>
                          <div className="flex gap-1.5">
                            <ScrimQuickActionButton
                              variant="default"
                              successMessage="Scrim confirmed!"
                              action={acceptScrimRequestAction.bind(null, orgSlug, org.id, req.id)}
                            >
                              <Check className="size-3.5" />
                              Accept
                            </ScrimQuickActionButton>
                            <ScrimQuickActionButton
                              variant="outline"
                              successMessage="Request declined."
                              action={declineScrimRequestAction.bind(null, orgSlug, org.id, req.id)}
                            >
                              <X className="size-3.5" />
                              Decline
                            </ScrimQuickActionButton>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4 space-y-3">
          {myRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven&apos;t requested a scrim yet.</p>
          ) : (
            myRequests.map((req) => (
              <Card key={req.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">
                      {req.listing.org.name} — {req.listing.team.name}
                      <Badge variant="secondary" className="ml-2">
                        {req.status}
                      </Badge>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateTime(req.listing.proposedStart, viewerTz, viewerHour12)}
                    </p>
                  </div>
                  {req.status === "PENDING" ? (
                    <ScrimQuickActionButton
                      variant="ghost"
                      successMessage="Request withdrawn."
                      action={withdrawScrimRequestAction.bind(null, orgSlug, org.id, req.id)}
                    >
                      Withdraw
                    </ScrimQuickActionButton>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
