import "server-only";
import { prisma } from "@/lib/db/prisma";

const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

let started = false;

/** Purges audit log entries older than each org's configured retention window (null =
 *  keep forever, the default). Deletion doesn't need minute-level precision, so this runs
 *  hourly rather than sharing the Discord reminder scheduler's 60s loop. */
export function startAuditRetentionScheduler() {
  if (started) return;
  started = true;
  runSweep();
  setInterval(runSweep, SWEEP_INTERVAL_MS);
}

async function runSweep() {
  try {
    const orgs = await prisma.organization.findMany({
      where: { auditLogRetentionDays: { not: null } },
      select: { id: true, auditLogRetentionDays: true },
    });
    await Promise.all(
      orgs.map((org) => {
        const days = org.auditLogRetentionDays;
        if (!days) return Promise.resolve();
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return prisma.auditLog.deleteMany({ where: { orgId: org.id, createdAt: { lt: cutoff } } });
      }),
    );
  } catch (err) {
    console.error("[audit-retention] sweep failed:", err);
  }
}
