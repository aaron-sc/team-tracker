"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, requireMembership } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { onboardingTaskSchema, completeTaskSchema } from "@/lib/validations/onboarding";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";
import { saveUploadedDocument, deleteUploadedFile, copyUploadedFile, UploadError } from "@/lib/storage/local";
import { notifyDiscord, FORMATION_EMBED_COLOR } from "@/lib/integrations/discord";

function parseTaskForm(formData: FormData) {
  const roleId = formData.get("roleId");
  const teamId = formData.get("teamId");
  return onboardingTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    type: formData.get("type"),
    url: formData.get("url") ?? "",
    body: formData.get("body") ?? "",
    required: formData.get("required") === "on",
    // "__all__" is the form's sentinel for "every role"/"every team" — Radix's Select can't hold
    // an empty string as an item value, so it's translated to null (unscoped) here instead.
    roleId: roleId === "__all__" ? "" : (roleId ?? ""),
    teamId: teamId === "__all__" ? "" : (teamId ?? ""),
    excludedMembershipIds: formData.getAll("excludedMembershipIds"),
    excludedTeamIds: formData.getAll("excludedTeamIds"),
  });
}

async function resolveRoleId(orgId: string, roleId: string | undefined): Promise<{ roleId: string | null } | { error: string }> {
  if (!roleId) return { roleId: null };
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { orgId: true } });
  if (!role || role.orgId !== orgId) return { error: "Invalid role." };
  return { roleId };
}

async function resolveTeamId(orgId: string, teamId: string | undefined): Promise<{ teamId: string | null } | { error: string }> {
  if (!teamId) return { teamId: null };
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { orgId: true } });
  if (!team || team.orgId !== orgId) return { error: "Invalid team." };
  return { teamId };
}

async function resolveExclusions(orgId: string, membershipIds: string[]): Promise<{ membershipIds: string[] } | { error: string }> {
  if (membershipIds.length === 0) return { membershipIds: [] };
  const unique = [...new Set(membershipIds)];
  const count = await prisma.membership.count({ where: { id: { in: unique }, orgId } });
  if (count !== unique.length) return { error: "One of the excluded members is invalid." };
  return { membershipIds: unique };
}

async function resolveTeamExclusions(orgId: string, teamIds: string[]): Promise<{ teamIds: string[] } | { error: string }> {
  if (teamIds.length === 0) return { teamIds: [] };
  const unique = [...new Set(teamIds)];
  const count = await prisma.team.count({ where: { id: { in: unique }, orgId } });
  if (count !== unique.length) return { error: "One of the excluded teams is invalid." };
  return { teamIds: unique };
}

export async function createOnboardingTaskAction(
  orgSlug: string,
  orgId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.onboarding_manage);

  const parsed = parseTaskForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const file = formData.get("file");
  let fileUrl: string | null = null;
  let fileName: string | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      const saved = await saveUploadedDocument(file, "onboarding-tasks");
      fileUrl = saved.url;
      fileName = saved.fileName;
    } catch (err) {
      return { error: err instanceof UploadError ? err.message : "Could not upload file." };
    }
  }

  if (parsed.data.type === "SIGNATURE" && !parsed.data.body && !fileUrl) {
    return { error: "A signature task needs document text and/or an uploaded file for people to sign." };
  }

  const resolvedRole = await resolveRoleId(orgId, parsed.data.roleId);
  if ("error" in resolvedRole) return { error: resolvedRole.error };

  const resolvedTeam = await resolveTeamId(orgId, parsed.data.teamId);
  if ("error" in resolvedTeam) return { error: resolvedTeam.error };

  const resolvedExclusions = await resolveExclusions(orgId, parsed.data.excludedMembershipIds);
  if ("error" in resolvedExclusions) return { error: resolvedExclusions.error };

  const resolvedTeamExclusions = await resolveTeamExclusions(orgId, parsed.data.excludedTeamIds);
  if ("error" in resolvedTeamExclusions) return { error: resolvedTeamExclusions.error };

  const maxOrder = await prisma.onboardingTask.aggregate({ where: { orgId }, _max: { order: true } });

  const task = await prisma.onboardingTask.create({
    data: {
      orgId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      type: parsed.data.type,
      url: parsed.data.url || null,
      body: parsed.data.body || null,
      fileUrl,
      fileName,
      required: parsed.data.required,
      roleId: resolvedRole.roleId,
      teamId: resolvedTeam.teamId,
      order: (maxOrder._max.order ?? 0) + 1,
      createdById: membership.membershipId,
      exclusions: { create: resolvedExclusions.membershipIds.map((membershipId) => ({ membershipId })) },
      teamExclusions: { create: resolvedTeamExclusions.teamIds.map((teamId) => ({ teamId })) },
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "onboarding_task.created",
    targetType: "OnboardingTask",
    targetId: task.id,
    metadata: { title: task.title, type: task.type },
  });

  revalidatePath(`/${orgSlug}/settings/onboarding`);
  revalidatePath(`/${orgSlug}/onboarding`);
  return { success: "Task added." };
}

export async function updateOnboardingTaskAction(
  orgSlug: string,
  orgId: string,
  taskId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.onboarding_manage);

  const task = await prisma.onboardingTask.findUnique({ where: { id: taskId } });
  if (!task || task.orgId !== orgId) return { error: "Task not found." };

  const parsed = parseTaskForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const file = formData.get("file");
  const removeFile = formData.get("removeFile") === "on";
  let fileUrl = task.fileUrl;
  let fileName = task.fileName;
  if (file instanceof File && file.size > 0) {
    try {
      const saved = await saveUploadedDocument(file, "onboarding-tasks");
      fileUrl = saved.url;
      fileName = saved.fileName;
    } catch (err) {
      return { error: err instanceof UploadError ? err.message : "Could not upload file." };
    }
  } else if (removeFile) {
    fileUrl = null;
    fileName = null;
  }

  if (parsed.data.type === "SIGNATURE" && !parsed.data.body && !fileUrl) {
    return { error: "A signature task needs document text and/or an uploaded file for people to sign." };
  }

  const resolvedRole = await resolveRoleId(orgId, parsed.data.roleId);
  if ("error" in resolvedRole) return { error: resolvedRole.error };

  const resolvedTeam = await resolveTeamId(orgId, parsed.data.teamId);
  if ("error" in resolvedTeam) return { error: resolvedTeam.error };

  const resolvedExclusions = await resolveExclusions(orgId, parsed.data.excludedMembershipIds);
  if ("error" in resolvedExclusions) return { error: resolvedExclusions.error };

  const resolvedTeamExclusions = await resolveTeamExclusions(orgId, parsed.data.excludedTeamIds);
  if ("error" in resolvedTeamExclusions) return { error: resolvedTeamExclusions.error };

  await prisma.onboardingTask.update({
    where: { id: taskId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      type: parsed.data.type,
      url: parsed.data.url || null,
      body: parsed.data.body || null,
      fileUrl,
      fileName,
      required: parsed.data.required,
      roleId: resolvedRole.roleId,
      teamId: resolvedTeam.teamId,
      // Full replace rather than a diff — the form always submits the complete current set of
      // checked members/teams, so whatever isn't in this list anymore should no longer be excluded.
      exclusions: {
        deleteMany: {},
        create: resolvedExclusions.membershipIds.map((membershipId) => ({ membershipId })),
      },
      teamExclusions: {
        deleteMany: {},
        create: resolvedTeamExclusions.teamIds.map((teamId) => ({ teamId })),
      },
    },
  });

  // Old file is only ever replaced/removed after the update above succeeds, so a mid-write
  // failure can't leave the DB pointing at a file we've already deleted from disk.
  if (task.fileUrl && task.fileUrl !== fileUrl) {
    await deleteUploadedFile(task.fileUrl);
  }

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "onboarding_task.updated",
    targetType: "OnboardingTask",
    targetId: taskId,
    metadata: { title: parsed.data.title },
  });

  revalidatePath(`/${orgSlug}/settings/onboarding`);
  revalidatePath(`/${orgSlug}/onboarding`);
  return { success: "Task updated." };
}

export async function setOnboardingTaskActiveAction(
  orgSlug: string,
  orgId: string,
  taskId: string,
  active: boolean,
): Promise<ActionState> {
  await requirePermission(orgId, Permission.onboarding_manage);

  const task = await prisma.onboardingTask.findUnique({ where: { id: taskId } });
  if (!task || task.orgId !== orgId) return { error: "Task not found." };

  await prisma.onboardingTask.update({ where: { id: taskId }, data: { active } });

  revalidatePath(`/${orgSlug}/settings/onboarding`);
  revalidatePath(`/${orgSlug}/onboarding`);
}

export async function deleteOnboardingTaskAction(orgSlug: string, orgId: string, taskId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.onboarding_manage);

  const task = await prisma.onboardingTask.findUnique({
    where: { id: taskId },
    include: { completions: { select: { signedFileUrl: true } } },
  });
  if (!task || task.orgId !== orgId) return { error: "Task not found." };

  await prisma.onboardingTask.delete({ where: { id: taskId } });

  // Cascades away the completion rows too — clean up their signed-file copies on disk, since
  // those are separate physical files from the task's own (already-deleted-below).
  await Promise.all([
    deleteUploadedFile(task.fileUrl),
    ...task.completions.map((c) => deleteUploadedFile(c.signedFileUrl)),
  ]);

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "onboarding_task.deleted",
    targetType: "OnboardingTask",
    targetId: taskId,
    metadata: { title: task.title },
  });

  revalidatePath(`/${orgSlug}/settings/onboarding`);
  revalidatePath(`/${orgSlug}/onboarding`);
  return { success: "Task deleted." };
}

/** Any active member completes/signs a task on their own behalf. */
export async function completeOnboardingTaskAction(
  orgSlug: string,
  orgId: string,
  taskId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { session, membership } = await requireMembership(orgId);

  const memberTeamIds = (
    await prisma.teamMembership.findMany({ where: { membershipId: membership.membershipId }, select: { teamId: true } })
  ).map((t) => t.teamId);

  const task = await prisma.onboardingTask.findUnique({
    where: { id: taskId },
    include: {
      exclusions: { where: { membershipId: membership.membershipId } },
      teamExclusions: { where: { teamId: { in: memberTeamIds } } },
    },
  });
  if (!task || task.orgId !== orgId || !task.active) return { error: "Task not found." };
  if (task.roleId && task.roleId !== membership.roleId) return { error: "Task not found." };
  if (task.teamId && !memberTeamIds.includes(task.teamId)) return { error: "Task not found." };
  if (task.exclusions.length > 0 || task.teamExclusions.length > 0) return { error: "Task not found." };

  const parsed = completeTaskSchema.safeParse({ signatureName: formData.get("signatureName") ?? "" });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (task.type === "SIGNATURE" && !parsed.data.signatureName) {
    return { error: "Type your full name to sign." };
  }

  const signedFileUrl =
    task.type === "SIGNATURE" && task.fileUrl ? await copyUploadedFile(task.fileUrl, "onboarding-signed") : null;

  await prisma.onboardingCompletion.upsert({
    where: { taskId_membershipId: { taskId, membershipId: membership.membershipId } },
    create: {
      taskId,
      membershipId: membership.membershipId,
      signatureName: task.type === "SIGNATURE" ? parsed.data.signatureName || null : null,
      signedSnapshot: task.type === "SIGNATURE" ? task.body : null,
      signedFileUrl,
      signedFileName: signedFileUrl ? task.fileName : null,
    },
    update: {},
  });

  if (task.required) {
    const stillIncomplete = await prisma.onboardingTask.count({
      where: {
        orgId,
        active: true,
        required: true,
        AND: [
          { OR: [{ roleId: null }, { roleId: membership.roleId }] },
          { OR: [{ teamId: null }, { teamId: { in: memberTeamIds } }] },
        ],
        exclusions: { none: { membershipId: membership.membershipId } },
        teamExclusions: { none: { teamId: { in: memberTeamIds } } },
        completions: { none: { membershipId: membership.membershipId } },
      },
    });
    if (stillIncomplete === 0) {
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { discordWebhookUrl: true } });
      await notifyDiscord(org?.discordWebhookUrl, {
        embeds: [
          {
            title: "Onboarding complete",
            description: `**${session.user.name ?? "A member"}** finished every required onboarding task and now has full access to the org.`,
            color: FORMATION_EMBED_COLOR,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }
  }

  revalidatePath(`/${orgSlug}/onboarding`);
  revalidatePath(`/${orgSlug}`, "layout");
  return { success: task.type === "SIGNATURE" ? "Signed." : "Marked complete." };
}
