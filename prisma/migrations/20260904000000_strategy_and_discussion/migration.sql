-- CreateTable
CREATE TABLE "MatchComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchComment_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchComment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PracticeComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeComment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PracticeComment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "map" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "agents" JSONB,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Strategy_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Strategy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Membership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- strategy_manage is new — grant it to every org's existing system Owner, Coach, and Captain
-- roles, since ROLE_PRESETS only applies at org-creation time and these roles already existed
-- before this permission did.
INSERT INTO "RolePermission" ("id", "roleId", "permission")
SELECT lower(hex(randomblob(16))), r."id", 'strategy_manage'
FROM "Role" r
WHERE r."name" IN ('Owner', 'Coach', 'Captain') AND r."isSystem" = 1
  AND NOT EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r."id" AND rp."permission" = 'strategy_manage');

