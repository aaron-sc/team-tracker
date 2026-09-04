"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { strategySchema } from "@/lib/validations/strategy";
import { Permission } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";
import type { ActionState } from "@/lib/actions/types";

function parseStrategyForm(formData: FormData) {
  const roles = formData.getAll("agentRole").map(String);
  const agentNames = formData.getAll("agentAgent").map(String);
  const agents = roles
    .map((role, i) => ({ role: role.trim(), agent: (agentNames[i] ?? "").trim() }))
    .filter((row) => row.role || row.agent);

  return strategySchema.safeParse({
    map: formData.get("map"),
    title: formData.get("title"),
    notes: formData.get("notes") ?? "",
    agents,
  });
}

export async function createStrategyAction(
  orgSlug: string,
  orgId: string,
  teamId: string,
  teamSlug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.strategy_manage);
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.orgId !== orgId) return { error: "Team not found." };

  const parsed = parseStrategyForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await prisma.strategy.create({
    data: {
      teamId,
      map: parsed.data.map,
      title: parsed.data.title,
      notes: parsed.data.notes || null,
      agents: parsed.data.agents && parsed.data.agents.length > 0 ? parsed.data.agents : Prisma.JsonNull,
      createdById: actor.membershipId,
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "strategy.created",
    targetType: "Team",
    targetId: teamId,
    metadata: { map: parsed.data.map, title: parsed.data.title },
  });

  revalidatePath(`/${orgSlug}/teams/${teamSlug}`);
  return { success: "Strategy added." };
}

export async function updateStrategyAction(
  orgSlug: string,
  orgId: string,
  strategyId: string,
  teamSlug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.strategy_manage);
  const strategy = await prisma.strategy.findUnique({ where: { id: strategyId }, include: { team: true } });
  if (!strategy || strategy.team.orgId !== orgId) return { error: "Not found." };

  const parsed = parseStrategyForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await prisma.strategy.update({
    where: { id: strategyId },
    data: {
      map: parsed.data.map,
      title: parsed.data.title,
      notes: parsed.data.notes || null,
      agents: parsed.data.agents && parsed.data.agents.length > 0 ? parsed.data.agents : Prisma.JsonNull,
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "strategy.updated",
    targetType: "Team",
    targetId: strategy.teamId,
    metadata: { map: parsed.data.map, title: parsed.data.title },
  });

  revalidatePath(`/${orgSlug}/teams/${teamSlug}`);
  return { success: "Strategy updated." };
}

export async function deleteStrategyAction(orgSlug: string, orgId: string, strategyId: string, teamSlug: string): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.strategy_manage);
  const strategy = await prisma.strategy.findUnique({ where: { id: strategyId }, include: { team: true } });
  if (!strategy || strategy.team.orgId !== orgId) return { error: "Not found." };

  await prisma.strategy.delete({ where: { id: strategyId } });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "strategy.deleted",
    targetType: "Team",
    targetId: strategy.teamId,
    metadata: { map: strategy.map, title: strategy.title },
  });

  revalidatePath(`/${orgSlug}/teams/${teamSlug}`);
  return { success: "Removed." };
}
