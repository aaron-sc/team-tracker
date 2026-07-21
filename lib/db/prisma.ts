import path from "node:path";
import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Prisma CLI resolves relative sqlite "file:" URLs relative to prisma/schema.prisma.
 * The generated client, once bundled by Next.js/Turbopack, loses that relative
 * anchor (import.meta.url points at a bundled chunk, not the source file), so
 * "file:./dev.db" fails to resolve at runtime even though `prisma migrate` works
 * fine. Re-resolve to an absolute path ourselves, using the same schema-relative
 * convention, so both CLI and app runtime point at the same database file.
 */
function resolveDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("file:")) return url;

  const relative = url.slice("file:".length);
  if (path.isAbsolute(relative)) return url;

  const abs = path.resolve(process.cwd(), "prisma", relative);
  return `file:${abs}`;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: resolveDatasourceUrl() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
