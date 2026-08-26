"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, requireMembership } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { onboardingTaskSchema, completeTaskSchema } from "@/lib/validations/onboarding";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

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

  const maxOrder = await prisma.onboardingTask.aggregate({ where: { orgId }, _max: { order: true } });

  const task = await prisma.onboardingTask.create({
    data: {
      orgId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      type: parsed.data.type,
      url: parsed.data.url || null,
      body: parsed.data.body || null,
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

  await prisma.onboardingTask.update({
    where: { id: taskId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      type: parsed.data.type,
      url: parsed.data.url || null,
      body: parsed.data.body || null,
      required: parsed.data.required,
    },
  });

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

  const task = await prisma.onboardingTask.findUnique({ where: { id: taskId } });
  if (!task || task.orgId !== orgId) return { error: "Task not found." };

  await prisma.onboardingTask.delete({ where: { id: taskId } });

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

  await prisma.onboardingCompletion.upsert({
    where: { taskId_membershipId: { taskId, membershipId: membership.membershipId } },
    create: {
      taskId,
      membershipId: membership.membershipId,
      signatureName: task.type === "SIGNATURE" ? parsed.data.signatureName || null : null,
      signedSnapshot: task.type === "SIGNATURE" ? task.body : null,
    },
    update: {},
  });

  revalidatePath(`/${orgSlug}/onboarding`);
  revalidatePath(`/${orgSlug}`, "layout");
  return { success: task.type === "SIGNATURE" ? "Signed." : "Marked complete." };
}
