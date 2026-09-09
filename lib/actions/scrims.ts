"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { createNotification } from "@/lib/notifications/create";
import { notifyDiscord, FORMATION_EMBED_COLOR } from "@/lib/integrations/discord";
import { scrimListingSchema, scrimRequestSchema } from "@/lib/validations/scrim";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

/** Orgs this org has already completed a matched scrim with, in either direction — the only
 *  orgs allowed to see this org's PARTNERS_ONLY listings (and vice versa). No separate
 *  partner-request flow; it's a natural consequence of having actually played via the app. */
export async function getPartnerOrgIds(orgId: string): Promise<string[]> {
  const [asListingOwner, asRequester] = await Promise.all([
    prisma.scrimRequest.findMany({
      where: { status: "ACCEPTED", listing: { orgId } },
      select: { requestingOrgId: true },
    }),
    prisma.scrimRequest.findMany({
      where: { status: "ACCEPTED", requestingOrgId: orgId },
      select: { listing: { select: { orgId: true } } },
    }),
  ]);
  const ids = new Set<string>();
  for (const r of asListingOwner) ids.add(r.requestingOrgId);
  for (const r of asRequester) ids.add(r.listing.orgId);
  return Array.from(ids);
}

export async function createScrimListingAction(
  orgSlug: string,
  orgId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.scrim_manage);

  const parsed = scrimListingSchema.safeParse({
    teamId: formData.get("teamId"),
    region: formData.get("region") ?? "",
    skillTier: formData.get("skillTier") ?? "",
    format: formData.get("format"),
    proposedStart: formData.get("proposedStart"),
    durationMinutes: formData.get("durationMinutes") || 60,
    notes: formData.get("notes") ?? "",
    visibility: formData.get("visibility") || "OPEN",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const team = await prisma.team.findUnique({ where: { id: parsed.data.teamId } });
  if (!team || team.orgId !== orgId) return { error: "Team not found." };

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const proposedStart = fromZonedTime(parsed.data.proposedStart, org.timezone);
  const proposedEnd = new Date(proposedStart.getTime() + parsed.data.durationMinutes * 60 * 1000);

  const listing = await prisma.scrimListing.create({
    data: {
      orgId,
      teamId: team.id,
      game: team.game,
      region: parsed.data.region || null,
      skillTier: parsed.data.skillTier || null,
      format: parsed.data.format,
      proposedStart,
      proposedEnd,
      timezone: org.timezone,
      notes: parsed.data.notes || null,
      visibility: parsed.data.visibility,
      createdById: membership.membershipId,
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "scrim_listing.created",
    targetType: "ScrimListing",
    targetId: listing.id,
    metadata: { teamId: team.id, game: team.game },
  });

  revalidatePath(`/${orgSlug}/scrims`);
  redirect(`/${orgSlug}/scrims`);
}

export async function cancelScrimListingAction(orgSlug: string, orgId: string, listingId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.scrim_manage);

  const listing = await prisma.scrimListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.orgId !== orgId) return { error: "Listing not found." };
  if (listing.status !== "OPEN") return { error: "Only open listings can be cancelled." };

  await prisma.scrimListing.update({ where: { id: listingId }, data: { status: "CANCELLED" } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "scrim_listing.cancelled",
    targetType: "ScrimListing",
    targetId: listingId,
    metadata: {},
  });

  revalidatePath(`/${orgSlug}/scrims`);
}

export async function createScrimRequestAction(
  orgSlug: string,
  orgId: string,
  listingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.scrim_manage);

  const listing = await prisma.scrimListing.findUnique({ where: { id: listingId }, include: { team: true, org: true } });
  if (!listing || listing.status !== "OPEN") return { error: "This listing is no longer open." };
  if (listing.orgId === orgId) return { error: "You can't request your own listing." };
  if (listing.visibility === "PARTNERS_ONLY") {
    const partnerIds = await getPartnerOrgIds(orgId);
    if (!partnerIds.includes(listing.orgId)) return { error: "This listing is only visible to that org's scrim partners." };
  }

  const parsed = scrimRequestSchema.safeParse({
    requestingTeamId: formData.get("requestingTeamId"),
    message: formData.get("message") ?? "",
    proposedStart: formData.get("proposedStart") ?? "",
    durationMinutes: formData.get("durationMinutes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const team = await prisma.team.findUnique({ where: { id: parsed.data.requestingTeamId } });
  if (!team || team.orgId !== orgId) return { error: "Team not found." };

  let proposedStart: Date | null = null;
  let proposedEnd: Date | null = null;
  if (parsed.data.proposedStart) {
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    proposedStart = fromZonedTime(parsed.data.proposedStart, org.timezone);
    proposedEnd = new Date(proposedStart.getTime() + (parsed.data.durationMinutes ?? 60) * 60 * 1000);
  }

  const request = await prisma.scrimRequest.create({
    data: {
      listingId,
      requestingOrgId: orgId,
      requestingTeamId: team.id,
      proposedStart,
      proposedEnd,
      message: parsed.data.message || null,
      createdById: membership.membershipId,
    },
  });

  await createNotification({
    membershipId: listing.createdById,
    type: "scrim_request",
    title: `${team.name} wants to scrim ${listing.team.name}`,
    body: parsed.data.message || undefined,
    linkUrl: `/${listing.org.slug}/scrims`,
  }).catch(() => {});

  await notifyDiscord(listing.team.discordWebhookUrl, {
    embeds: [
      {
        title: "New scrim request",
        description: `**${team.name}** requested to scrim your listing for **${listing.team.name}**.`,
        color: FORMATION_EMBED_COLOR,
        fields: parsed.data.message ? [{ name: "Message", value: parsed.data.message }] : [],
      },
    ],
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "scrim_request.created",
    targetType: "ScrimRequest",
    targetId: request.id,
    metadata: { listingId },
  });

  revalidatePath(`/${orgSlug}/scrims`);
  redirect(`/${orgSlug}/scrims`);
}

export async function withdrawScrimRequestAction(orgSlug: string, orgId: string, requestId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.scrim_manage);

  const request = await prisma.scrimRequest.findUnique({ where: { id: requestId } });
  if (!request || request.requestingOrgId !== orgId) return { error: "Request not found." };
  if (request.status !== "PENDING") return { error: "Only pending requests can be withdrawn." };

  await prisma.scrimRequest.update({ where: { id: requestId }, data: { status: "WITHDRAWN" } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "scrim_request.withdrawn",
    targetType: "ScrimRequest",
    targetId: requestId,
    metadata: {},
  });

  revalidatePath(`/${orgSlug}/scrims`);
}

export async function declineScrimRequestAction(orgSlug: string, orgId: string, requestId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.scrim_manage);

  const request = await prisma.scrimRequest.findUnique({ where: { id: requestId }, include: { listing: true } });
  if (!request || request.listing.orgId !== orgId) return { error: "Request not found." };
  if (request.status !== "PENDING") return { error: "Only pending requests can be declined." };

  await prisma.scrimRequest.update({ where: { id: requestId }, data: { status: "DECLINED", respondedAt: new Date() } });

  await createNotification({
    membershipId: request.createdById,
    type: "scrim_declined",
    title: `Your scrim request was declined`,
    linkUrl: `/${orgSlug}/scrims`,
  }).catch(() => {});

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "scrim_request.declined",
    targetType: "ScrimRequest",
    targetId: requestId,
    metadata: {},
  });

  revalidatePath(`/${orgSlug}/scrims`);
}

async function findOrCreateLinkedOpponent(orgId: string, linkedTeamId: string, name: string): Promise<string> {
  const existing = await prisma.opponent.findFirst({ where: { orgId, linkedTeamId } });
  if (existing) return existing.id;
  const created = await prisma.opponent.create({ data: { orgId, name, linkedTeamId } });
  return created.id;
}

export async function acceptScrimRequestAction(orgSlug: string, orgId: string, requestId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.scrim_manage);

  const request = await prisma.scrimRequest.findUnique({
    where: { id: requestId },
    include: { listing: { include: { team: true, org: true } }, requestingTeam: { include: { org: true } } },
  });
  if (!request || request.listing.orgId !== orgId) return { error: "Request not found." };
  if (request.status !== "PENDING") return { error: "This request has already been decided." };

  const { listing } = request;
  const scheduledStart = request.proposedStart ?? listing.proposedStart;
  const scheduledEnd = request.proposedEnd ?? listing.proposedEnd;
  const durationMinutes = Math.max(15, Math.round((scheduledEnd.getTime() - scheduledStart.getTime()) / 60000));

  const [homeOpponentId, awayOpponentId, homeRoster, awayRoster] = await Promise.all([
    findOrCreateLinkedOpponent(listing.orgId, request.requestingTeamId, `${request.requestingTeam.org.name} — ${request.requestingTeam.name}`),
    findOrCreateLinkedOpponent(request.requestingOrgId, listing.teamId, `${listing.org.name} — ${listing.team.name}`),
    prisma.teamMembership.findMany({ where: { teamId: listing.teamId }, select: { membershipId: true } }),
    prisma.teamMembership.findMany({ where: { teamId: request.requestingTeamId }, select: { membershipId: true } }),
  ]);

  const { homeSession, awaySession } = await prisma.$transaction(async (tx) => {
    const home = await tx.practiceSession.create({
      data: {
        teamId: listing.teamId,
        type: "SCRIM",
        opponentId: homeOpponentId,
        scheduledAt: scheduledStart,
        durationMinutes,
        timezone: listing.timezone,
        createdById: membership.membershipId,
        attendances: { create: homeRoster.map((r) => ({ membershipId: r.membershipId })) },
      },
    });
    const away = await tx.practiceSession.create({
      data: {
        teamId: request.requestingTeamId,
        type: "SCRIM",
        opponentId: awayOpponentId,
        scheduledAt: scheduledStart,
        durationMinutes,
        timezone: listing.timezone,
        createdById: request.createdById,
        attendances: { create: awayRoster.map((r) => ({ membershipId: r.membershipId })) },
      },
    });
    await tx.scrimRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED", respondedAt: new Date(), homeSessionId: home.id, awaySessionId: away.id },
    });
    await tx.scrimRequest.updateMany({
      where: { listingId: listing.id, status: "PENDING", id: { not: requestId } },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
    await tx.scrimListing.update({ where: { id: listing.id }, data: { status: "MATCHED" } });
    return { homeSession: home, awaySession: away };
  });

  await Promise.all([
    createNotification({
      membershipId: request.createdById,
      type: "scrim_accepted",
      title: `${listing.team.name} accepted your scrim request`,
      linkUrl: `/${request.requestingTeam.org.slug}/schedule/practice/${awaySession.id}`,
    }).catch(() => {}),
    notifyDiscord(listing.team.discordWebhookUrl, {
      embeds: [
        {
          title: "Scrim confirmed!",
          description: `**${listing.team.name}** vs **${request.requestingTeam.name}** — added to both calendars.`,
          color: FORMATION_EMBED_COLOR,
        },
      ],
    }),
    notifyDiscord(request.requestingTeam.discordWebhookUrl, {
      embeds: [
        {
          title: "Scrim confirmed!",
          description: `**${request.requestingTeam.name}** vs **${listing.team.name}** — added to both calendars.`,
          color: FORMATION_EMBED_COLOR,
        },
      ],
    }),
  ]);

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "scrim_request.accepted",
    targetType: "ScrimRequest",
    targetId: requestId,
    metadata: { homeSessionId: homeSession.id, requestingOrgId: request.requestingOrgId },
  });

  revalidatePath(`/${orgSlug}/scrims`);
  revalidatePath(`/${orgSlug}/schedule`);
  redirect(`/${orgSlug}/schedule/practice/${homeSession.id}`);
}
