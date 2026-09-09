
-- CreateTable
CREATE TABLE "ScrimListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "region" TEXT,
    "skillTier" TEXT,
    "format" TEXT NOT NULL DEFAULT 'BO1',
    "proposedStart" DATETIME NOT NULL,
    "proposedEnd" DATETIME NOT NULL,
    "timezone" TEXT NOT NULL,
    "notes" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'OPEN',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScrimListing_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScrimListing_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScrimRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "requestingOrgId" TEXT NOT NULL,
    "requestingTeamId" TEXT NOT NULL,
    "proposedStart" DATETIME,
    "proposedEnd" DATETIME,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "respondedAt" DATETIME,
    "homeSessionId" TEXT,
    "awaySessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScrimRequest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ScrimListing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScrimRequest_requestingOrgId_fkey" FOREIGN KEY ("requestingOrgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScrimRequest_requestingTeamId_fkey" FOREIGN KEY ("requestingTeamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScrimMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "senderOrgId" TEXT NOT NULL,
    "senderMembershipId" TEXT,
    "body" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'formation',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScrimMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ScrimRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Opponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "contact" TEXT,
    "notes" TEXT,
    "linkedTeamId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Opponent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Opponent_linkedTeamId_fkey" FOREIGN KEY ("linkedTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Opponent" ("contact", "createdAt", "id", "logoUrl", "name", "notes", "orgId", "updatedAt") SELECT "contact", "createdAt", "id", "logoUrl", "name", "notes", "orgId", "updatedAt" FROM "Opponent";
DROP TABLE "Opponent";
ALTER TABLE "new_Opponent" RENAME TO "Opponent";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ScrimListing_status_game_idx" ON "ScrimListing"("status", "game");

-- CreateIndex
CREATE INDEX "ScrimRequest_listingId_status_idx" ON "ScrimRequest"("listingId", "status");

-- CreateIndex
CREATE INDEX "ScrimMessage_requestId_createdAt_idx" ON "ScrimMessage"("requestId", "createdAt");


-- scrim_manage is new — grant it to every org's existing system Owner, Coach, and Captain
-- roles (same distribution as practice_create), since ROLE_PRESETS only applies at org-creation
-- time and these roles already existed before this permission did.
INSERT INTO "RolePermission" ("id", "roleId", "permission")
SELECT lower(hex(randomblob(16))), r."id", 'scrim_manage'
FROM "Role" r
WHERE r."name" IN ('Owner', 'Coach', 'Captain') AND r."isSystem" = 1
  AND NOT EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r."id" AND rp."permission" = 'scrim_manage');
