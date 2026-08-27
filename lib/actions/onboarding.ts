"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, requireMembership } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { onboardingTaskSchema, completeTaskSchema } from "@/lib/validations/onboarding";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";
import { saveUploadedDocument, deleteUploadedFile, copyUploadedFile, UploadError } from "@/lib/storage/local";

function parseTaskForm(formData: FormData) {
  return onboardingTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    type: formData.get("type"),
    url: formData.get("url") ?? "",
    body: formData.get("body") ?? "",
    required: formData.get("required") === "on",
  });
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
      order: (maxOrder._max.order ?? 0) + 1,
      createdById: membership.membershipId,
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
  const { membership } = await requireMembership(orgId);

  const task = await prisma.onboardingTask.findUnique({ where: { id: taskId } });
  if (!task || task.orgId !== orgId || !task.active) return { error: "Task not found." };

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

  revalidatePath(`/${orgSlug}/onboarding`);
  revalidatePath(`/${orgSlug}`, "layout");
  return { success: task.type === "SIGNATURE" ? "Signed." : "Marked complete." };
}
