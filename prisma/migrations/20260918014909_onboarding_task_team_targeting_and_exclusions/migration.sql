-- CreateTable
CREATE TABLE "OnboardingTaskTeamExclusion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnboardingTaskTeamExclusion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "OnboardingTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OnboardingTaskTeamExclusion_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OnboardingTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'ACKNOWLEDGE',
    "url" TEXT,
    "body" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "roleId" TEXT,
    "teamId" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OnboardingTask_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OnboardingTask_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OnboardingTask_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OnboardingTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Membership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OnboardingTask" ("active", "body", "createdAt", "createdById", "description", "fileName", "fileUrl", "id", "order", "orgId", "required", "roleId", "title", "type", "updatedAt", "url") SELECT "active", "body", "createdAt", "createdById", "description", "fileName", "fileUrl", "id", "order", "orgId", "required", "roleId", "title", "type", "updatedAt", "url" FROM "OnboardingTask";
DROP TABLE "OnboardingTask";
ALTER TABLE "new_OnboardingTask" RENAME TO "OnboardingTask";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingTaskTeamExclusion_taskId_teamId_key" ON "OnboardingTaskTeamExclusion"("taskId", "teamId");
