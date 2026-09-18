import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getClientIp } from "@/lib/utils/rate-limit";

export async function logAudit(params: {
  orgId: string;
  actorMembershipId?: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  // Best-effort — a server action always has an incoming request to read these from, but this
  // still shouldn't ever fail the write itself if headers() throws for some reason.
  let ipAddress: string | null = null;
  let userAgent: string | null = null;
  try {
    ipAddress = await getClientIp();
    userAgent = (await headers()).get("user-agent");
  } catch {
    // keep both null
  }

  await prisma.auditLog.create({
    data: {
      orgId: params.orgId,
      actorMembershipId: params.actorMembershipId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata,
      ipAddress: ipAddress && ipAddress !== "unknown" ? ipAddress : null,
      userAgent,
    },
  });
}
