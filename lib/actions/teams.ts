"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { teamSchema, rosterEntrySchema, updateRosterEntrySchema } from "@/lib/validations/team";
import { Permission } from "@/lib/generated/prisma/enums";
import { isReservedSlug, slugify } from "@/lib/utils/slug";
import { saveUploadedImage, deleteUploadedFile, UploadError } from "@/lib/storage/local";
import type { ActionState } from "@/lib/actions/types";

async function generateUniqueTeamSlug(orgId: string, name: string): Promise<string> {
  const base = slugify(name) || "team";
  let slug = base;
  let n = 1;
  while (isReservedSlug(slug) || (await prisma.team.findUnique({ where: { orgId_slug: { orgId, slug } } }))) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export async function createTeamAction(orgSlug: string, orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.team_create);

  const parsed = teamSchema.safeParse({
    name: formData.get("name"),
    game: formData.get("game"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const slug = await generateUniqueTeamSlug(orgId, parsed.data.name);

  const team = await prisma.team.create({
    data: { orgId, name: parsed.data.name, game: parsed.data.game, slug },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "team.created",
    targetType: "Team",
    targetId: team.id,
    metadata: { name: team.name, game: team.game },
  });

  redirect(`/${orgSlug}/teams/${team.slug}`);
}

export async function updateTeamAction(
  orgSlug: string,
  orgId: string,
  teamId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.team_edit);

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.orgId !== orgId) return { error: "Team not found." };

  const parsed = teamSchema.safeParse({
    name: formData.get("name"),
    game: formData.get("game"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await prisma.team.update({
    where: { id: teamId },
    data: { name: parsed.data.name, game: parsed.data.game },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "team.updated",
    targetType: "Team",
    targetId: teamId,
    metadata: { name: parsed.data.name, game: parsed.data.game },
  });

  revalidatePath(`/${orgSlug}/teams/${team.slug}`);
  redirect(`/${orgSlug}/teams/${team.slug}`);
}

export async function updateTeamLogoAction(
  orgSlug: string,
  orgId: string,
  teamId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.team_edit);

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.orgId !== orgId) return { error: "Team not found." };

  const file = formData.get("logo");
  let logoUrl: string;
  try {
    logoUrl = await saveUploadedImage(file as File, "team-logos");
  } catch (err) {
    return { error: err instanceof UploadError ? err.message : "Could not upload image." };
  }

  await prisma.team.update({ where: { id: teamId }, data: { logoUrl } });
  await deleteUploadedFile(team.logoUrl);

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "team.logo_updated",
    targetType: "Team",
    targetId: teamId,
    metadata: { logoUrl },
  });

  revalidatePath(`/${orgSlug}/teams/${team.slug}`);
  revalidatePath(`/${orgSlug}/teams/${team.slug}/edit`);
  return { success: "Logo updated." };
}

export async function removeTeamLogoAction(orgSlug: string, orgId: string, teamId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.team_edit);

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.orgId !== orgId) return { error: "Team not found." };

  await prisma.team.update({ where: { id: teamId }, data: { logoUrl: null } });
  await deleteUploadedFile(team.logoUrl);

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "team.logo_removed",
    targetType: "Team",
    targetId: teamId,
  });

  revalidatePath(`/${orgSlug}/teams/${team.slug}`);
  revalidatePath(`/${orgSlug}/teams/${team.slug}/edit`);
  return { success: "Logo removed." };
}

export async function deleteTeamAction(orgSlug: string, orgId: string, teamId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.team_delete);

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.orgId !== orgId) return { error: "Team not found." };

  await prisma.team.delete({ where: { id: teamId } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "team.deleted",
    targetType: "Team",
    targetId: teamId,
    metadata: { name: team.name },
  });

  redirect(`/${orgSlug}/teams`);
}

export async function addToRosterAction(
  orgSlug: string,
  orgId: string,
  teamId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.roster_manage);

  const parsed = rosterEntrySchema.safeParse({
    membershipId: formData.get("membershipId"),
    jerseyNumber: formData.get("jerseyNumber") ?? "",
    position: formData.get("position") ?? "",
    inGameName: formData.get("inGameName") ?? "",
    isStarter: formData.get("isStarter") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const targetMembership = await prisma.membership.findUnique({ where: { id: parsed.data.membershipId } });
  if (!targetMembership || targetMembership.orgId !== orgId) {
    return { error: "Member not found." };
  }

  const existing = await prisma.teamMembership.findUnique({
    where: { membershipId_teamId: { membershipId: parsed.data.membershipId, teamId } },
  });
  if (existing) {
    return { error: "This person is already on the roster." };
  }

  await prisma.teamMembership.create({
    data: {
      membershipId: parsed.data.membershipId,
      teamId,
      jerseyNumber: parsed.data.jerseyNumber || null,
      position: parsed.data.position || null,
      inGameName: parsed.data.inGameName || null,
      isStarter: parsed.data.isStarter,
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "roster.member_added",
    targetType: "Team",
    targetId: teamId,
    metadata: { membershipId: parsed.data.membershipId },
  });

  revalidatePath(`/${orgSlug}/teams`);
}

export async function updateRosterEntryAction(
  orgSlug: string,
  orgId: string,
  teamMembershipId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission(orgId, Permission.roster_manage);

  const parsed = updateRosterEntrySchema.safeParse({
    jerseyNumber: formData.get("jerseyNumber") ?? "",
    position: formData.get("position") ?? "",
    inGameName: formData.get("inGameName") ?? "",
    isStarter: formData.get("isStarter") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const entry = await prisma.teamMembership.findUnique({
    where: { id: teamMembershipId },
    include: { membership: true },
  });
  if (!entry || entry.membership.orgId !== orgId) return { error: "Roster entry not found." };

  await prisma.teamMembership.update({
    where: { id: teamMembershipId },
    data: {
      jerseyNumber: parsed.data.jerseyNumber || null,
      position: parsed.data.position || null,
      inGameName: parsed.data.inGameName || null,
      isStarter: parsed.data.isStarter,
    },
  });

  revalidatePath(`/${orgSlug}/teams`);
}

export async function removeFromRosterAction(orgSlug: string, orgId: string, teamMembershipId: string): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.roster_manage);

  const entry = await prisma.teamMembership.findUnique({
    where: { id: teamMembershipId },
    include: { membership: true },
  });
  if (!entry || entry.membership.orgId !== orgId) return { error: "Roster entry not found." };

  await prisma.teamMembership.delete({ where: { id: teamMembershipId } });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "roster.member_removed",
    targetType: "Team",
    targetId: entry.teamId,
    metadata: { membershipId: entry.membershipId },
  });

  revalidatePath(`/${orgSlug}/teams`);
}
