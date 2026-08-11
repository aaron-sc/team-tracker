"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { prospectSchema, prospectStageSchema, parseLinks } from "@/lib/validations/prospect";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";
import { createNotification } from "@/lib/notifications/create";

function parseProspectForm(formData: FormData) {
  const levelId = formData.get("levelId");
  return prospectSchema.safeParse({
    name: formData.get("name"),
    levelId: levelId && levelId !== "none" ? levelId : "",
    game: formData.get("game"),
    teamId: formData.get("teamId") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    discordHandle: formData.get("discordHandle") ?? "",
    schoolOrOrg: formData.get("schoolOrOrg") ?? "",
    statsLinks: formData.get("statsLinks") ?? "",
    socialLinks: formData.get("socialLinks") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

export async function createProspectAction(orgSlug: string, orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.recruitment_manage);

  const parsed = parseProspectForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  if (d.levelId) {
    const level = await prisma.prospectLevel.findUnique({ where: { id: d.levelId } });
    if (!level || level.orgId !== orgId) return { error: "Invalid level selected." };
  }

  const prospect = await prisma.recruitmentProspect.create({
    data: {
      orgId,
      name: d.name,
      levelId: d.levelId || null,
      game: d.game,
      teamId: d.teamId || null,
      email: d.email || null,
      phone: d.phone || null,
      discordHandle: d.discordHandle || null,
      schoolOrOrg: d.schoolOrOrg || null,
      statsLinks: d.statsLinks ? parseLinks(d.statsLinks) : undefined,
      socialLinks: d.socialLinks ? parseLinks(d.socialLinks) : undefined,
      notes: d.notes || null,
      assignedToMembershipId: membership.membershipId,
      statusHistory: {
        create: { toStage: "SCOUTING", changedById: membership.membershipId },
      },
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "prospect.created",
    targetType: "RecruitmentProspect",
    targetId: prospect.id,
    metadata: { name: prospect.name },
  });

  revalidatePath(`/${orgSlug}/recruitment`);
  redirect(`/${orgSlug}/recruitment/${prospect.id}`);
}

export async function updateProspectAction(
  orgSlug: string,
  orgId: string,
  prospectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission(orgId, Permission.recruitment_manage);

  const prospect = await prisma.recruitmentProspect.findUnique({ where: { id: prospectId } });
  if (!prospect || prospect.orgId !== orgId) return { error: "Prospect not found." };

  const parsed = parseProspectForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  if (d.levelId) {
    const level = await prisma.prospectLevel.findUnique({ where: { id: d.levelId } });
    if (!level || level.orgId !== orgId) return { error: "Invalid level selected." };
  }

  await prisma.recruitmentProspect.update({
    where: { id: prospectId },
    data: {
      name: d.name,
      levelId: d.levelId || null,
      game: d.game,
      teamId: d.teamId || null,
      email: d.email || null,
      phone: d.phone || null,
      discordHandle: d.discordHandle || null,
      schoolOrOrg: d.schoolOrOrg || null,
      statsLinks: d.statsLinks ? parseLinks(d.statsLinks) : undefined,
      socialLinks: d.socialLinks ? parseLinks(d.socialLinks) : undefined,
      notes: d.notes || null,
    },
  });

  revalidatePath(`/${orgSlug}/recruitment`);
  redirect(`/${orgSlug}/recruitment/${prospectId}`);
}

export async function changeProspectStageAction(
  orgSlug: string,
  orgId: string,
  prospectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.recruitment_manage);

  const prospect = await prisma.recruitmentProspect.findUnique({ where: { id: prospectId } });
  if (!prospect || prospect.orgId !== orgId) return { error: "Prospect not found." };

  const parsed = prospectStageSchema.safeParse({
    stage: formData.get("stage"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await prisma.$transaction([
    prisma.recruitmentProspect.update({ where: { id: prospectId }, data: { stage: parsed.data.stage } }),
    prisma.prospectStatusHistory.create({
      data: {
        prospectId,
        fromStage: prospect.stage,
        toStage: parsed.data.stage,
        changedById: membership.membershipId,
        note: parsed.data.note || null,
      },
    }),
  ]);

  if (prospect.assignedToMembershipId && prospect.assignedToMembershipId !== membership.membershipId) {
    await createNotification({
      membershipId: prospect.assignedToMembershipId,
      type: "prospect_stage",
      title: `${prospect.name} moved to ${parsed.data.stage}`,
      linkUrl: `/${orgSlug}/recruitment/${prospectId}`,
    });
  }

  revalidatePath(`/${orgSlug}/recruitment`);
  revalidatePath(`/${orgSlug}/recruitment/${prospectId}`);
}

export async function deleteProspectAction(orgSlug: string, orgId: string, prospectId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.recruitment_delete);

  const prospect = await prisma.recruitmentProspect.findUnique({ where: { id: prospectId } });
  if (!prospect || prospect.orgId !== orgId) return { error: "Prospect not found." };

  await prisma.recruitmentProspect.delete({ where: { id: prospectId } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "prospect.deleted",
    targetType: "RecruitmentProspect",
    targetId: prospectId,
    metadata: { name: prospect.name },
  });

  revalidatePath(`/${orgSlug}/recruitment`);
  redirect(`/${orgSlug}/recruitment`);
}
