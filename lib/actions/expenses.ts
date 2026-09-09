"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { expenseSchema } from "@/lib/validations/expense";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

export async function createExpenseAction(orgSlug: string, orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.expense_manage);

  const rawTeamId = String(formData.get("teamId") ?? "");
  const parsed = expenseSchema.safeParse({
    category: formData.get("category"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    incurredAt: formData.get("incurredAt"),
    // "none" is the Select's sentinel for "org-wide" — Radix disallows an actual empty value.
    teamId: rawTeamId === "none" ? "" : rawTeamId,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await prisma.expense.create({
    data: {
      orgId,
      teamId: parsed.data.teamId || null,
      category: parsed.data.category,
      description: parsed.data.description,
      amountCents: Math.round(parsed.data.amount * 100),
      incurredAt: new Date(parsed.data.incurredAt),
      createdById: actor.membershipId,
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "expense.created",
    targetType: "Expense",
    targetId: orgId,
    metadata: { category: parsed.data.category, amount: parsed.data.amount },
  });

  revalidatePath(`/${orgSlug}/expenses`);
  return { success: "Added." };
}

export async function updateExpenseAction(
  orgSlug: string,
  orgId: string,
  expenseId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.expense_manage);

  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense || expense.orgId !== orgId) return { error: "Not found." };

  const rawTeamId = String(formData.get("teamId") ?? "");
  const parsed = expenseSchema.safeParse({
    category: formData.get("category"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    incurredAt: formData.get("incurredAt"),
    teamId: rawTeamId === "none" ? "" : rawTeamId,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await prisma.expense.update({
    where: { id: expenseId },
    data: {
      teamId: parsed.data.teamId || null,
      category: parsed.data.category,
      description: parsed.data.description,
      amountCents: Math.round(parsed.data.amount * 100),
      incurredAt: new Date(parsed.data.incurredAt),
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "expense.updated",
    targetType: "Expense",
    targetId: expenseId,
    metadata: { category: parsed.data.category, amount: parsed.data.amount },
  });

  revalidatePath(`/${orgSlug}/expenses`);
  return { success: "Saved." };
}

export async function deleteExpenseAction(orgSlug: string, orgId: string, expenseId: string): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.expense_manage);
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense || expense.orgId !== orgId) return { error: "Not found." };

  await prisma.expense.delete({ where: { id: expenseId } });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "expense.deleted",
    targetType: "Expense",
    targetId: expenseId,
    metadata: { category: expense.category, amount: expense.amountCents / 100 },
  });

  revalidatePath(`/${orgSlug}/expenses`);
  return { success: "Removed." };
}
