-- Makes Announcement.authorId and ProspectStatusHistory.changedById nullable
-- (SET NULL on delete) and TeamInviteLink.createdById cascade on delete, so a
-- member leaving an org (hard-deleting their Membership row) doesn't hit a
-- foreign-key restrict error from historical rows they authored/changed/created.
-- (AuditLog.actorMembershipId and RecruitmentProspect.assignedToMembershipId
-- were already nullable and already SET NULL by default — no DDL needed there.)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "teamId" TEXT,
    "authorId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Announcement_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Announcement_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Membership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Announcement" ("authorId", "body", "createdAt", "id", "orgId", "pinned", "teamId", "title", "updatedAt") SELECT "authorId", "body", "createdAt", "id", "orgId", "pinned", "teamId", "title", "updatedAt" FROM "Announcement";
DROP TABLE "Announcement";
ALTER TABLE "new_Announcement" RENAME TO "Announcement";
CREATE TABLE "new_ProspectStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT NOT NULL,
    "changedById" TEXT,
    "note" TEXT,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProspectStatusHistory_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "RecruitmentProspect" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProspectStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "Membership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProspectStatusHistory" ("changedAt", "changedById", "fromStage", "id", "note", "prospectId", "toStage") SELECT "changedAt", "changedById", "fromStage", "id", "note", "prospectId", "toStage" FROM "ProspectStatusHistory";
DROP TABLE "ProspectStatusHistory";
ALTER TABLE "new_ProspectStatusHistory" RENAME TO "ProspectStatusHistory";
CREATE TABLE "new_TeamInviteLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamInviteLink_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamInviteLink_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamInviteLink_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TeamInviteLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Membership" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TeamInviteLink" ("createdAt", "createdById", "expiresAt", "id", "orgId", "revokedAt", "roleId", "teamId", "token", "useCount") SELECT "createdAt", "createdById", "expiresAt", "id", "orgId", "revokedAt", "roleId", "teamId", "token", "useCount" FROM "TeamInviteLink";
DROP TABLE "TeamInviteLink";
ALTER TABLE "new_TeamInviteLink" RENAME TO "TeamInviteLink";
CREATE UNIQUE INDEX "TeamInviteLink_token_key" ON "TeamInviteLink"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
