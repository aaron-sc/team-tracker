-- AlterTable
ALTER TABLE "Team" ADD COLUMN "discordReminderChannelId" TEXT;
ALTER TABLE "Team" ADD COLUMN "discordRoleId" TEXT;

-- AlterTable
ALTER TABLE "TeamMembership" ADD COLUMN "gameStatsCache" JSONB;
ALTER TABLE "TeamMembership" ADD COLUMN "gameStatsUpdatedAt" DATETIME;

-- CreateTable
CREATE TABLE "MatchAttendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "respondedAt" DATETIME,
    "note" TEXT,
    CONSTRAINT "MatchAttendance_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchAttendance_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnnouncementRead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "announcementId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "readAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnnouncementRead_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamResourceLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "addedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamResourceLink_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamResourceLink_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "Membership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "teamId" TEXT,
    "question" TEXT NOT NULL,
    "createdById" TEXT,
    "closesAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Poll_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Poll_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Poll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Membership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PollOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pollId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PollVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pollId" TEXT NOT NULL,
    "pollOptionId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PollVote_pollOptionId_fkey" FOREIGN KEY ("pollOptionId") REFERENCES "PollOption" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PollVote_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GearItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "serialNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "assignedToMembershipId" TEXT,
    "assignedToTeamId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GearItem_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GearItem_assignedToMembershipId_fkey" FOREIGN KEY ("assignedToMembershipId") REFERENCES "Membership" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GearItem_assignedToTeamId_fkey" FOREIGN KEY ("assignedToTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "teamId" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "incurredAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Expense_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Membership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Five new permissions — grant them to every org's existing system roles, since ROLE_PRESETS
-- only applies at org-creation time and these roles already existed before these permissions did.
INSERT INTO "RolePermission" ("id", "roleId", "permission")
SELECT lower(hex(randomblob(16))), r."id", 'analytics_view'
FROM "Role" r
WHERE r."name" IN ('Owner', 'Coach', 'Manager') AND r."isSystem" = 1
  AND NOT EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r."id" AND rp."permission" = 'analytics_view');

INSERT INTO "RolePermission" ("id", "roleId", "permission")
SELECT lower(hex(randomblob(16))), r."id", 'poll_manage'
FROM "Role" r
WHERE r."name" IN ('Owner', 'Coach', 'Manager', 'Captain') AND r."isSystem" = 1
  AND NOT EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r."id" AND rp."permission" = 'poll_manage');

INSERT INTO "RolePermission" ("id", "roleId", "permission")
SELECT lower(hex(randomblob(16))), r."id", 'team_resources_manage'
FROM "Role" r
WHERE r."name" IN ('Owner', 'Coach', 'Manager') AND r."isSystem" = 1
  AND NOT EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r."id" AND rp."permission" = 'team_resources_manage');

INSERT INTO "RolePermission" ("id", "roleId", "permission")
SELECT lower(hex(randomblob(16))), r."id", 'gear_manage'
FROM "Role" r
WHERE r."name" IN ('Owner', 'Manager') AND r."isSystem" = 1
  AND NOT EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r."id" AND rp."permission" = 'gear_manage');

INSERT INTO "RolePermission" ("id", "roleId", "permission")
SELECT lower(hex(randomblob(16))), r."id", 'expense_manage'
FROM "Role" r
WHERE r."name" IN ('Owner', 'Manager') AND r."isSystem" = 1
  AND NOT EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r."id" AND rp."permission" = 'expense_manage');

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "phone" TEXT,
    "discordHandle" TEXT,
    "discordUserId" TEXT,
    "discordDmReminders" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT,
    "timeFormat" TEXT NOT NULL DEFAULT '12h',
    "emailVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME
);
INSERT INTO "new_User" ("avatarUrl", "createdAt", "discordHandle", "discordUserId", "email", "emailVerifiedAt", "id", "lastLoginAt", "name", "passwordHash", "phone", "timeFormat", "timezone", "updatedAt") SELECT "avatarUrl", "createdAt", "discordHandle", "discordUserId", "email", "emailVerifiedAt", "id", "lastLoginAt", "name", "passwordHash", "phone", "timeFormat", "timezone", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_discordUserId_key" ON "User"("discordUserId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "MatchAttendance_matchId_membershipId_key" ON "MatchAttendance"("matchId", "membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementRead_announcementId_membershipId_key" ON "AnnouncementRead"("announcementId", "membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "PollVote_pollId_membershipId_key" ON "PollVote"("pollId", "membershipId");

