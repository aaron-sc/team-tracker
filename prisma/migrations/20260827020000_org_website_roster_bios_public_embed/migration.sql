-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "websiteUrl" TEXT;

-- AlterTable
ALTER TABLE "TeamMembership" ADD COLUMN "bio" TEXT;
ALTER TABLE "TeamMembership" ADD COLUMN "trackerLeagueOfLegends" TEXT;
ALTER TABLE "TeamMembership" ADD COLUMN "trackerRocketLeague" TEXT;
ALTER TABLE "TeamMembership" ADD COLUMN "trackerSmash" TEXT;
ALTER TABLE "TeamMembership" ADD COLUMN "trackerValorant" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "discordWebhookUrl" TEXT,
    "discordMentionRoleId" TEXT,
    "discordMatchReminderMinutes" INTEGER,
    "discordPracticeReminderMinutes" INTEGER,
    "discordScrimReminderMinutes" INTEGER,
    "publicRosterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publicRosterToken" TEXT,
    CONSTRAINT "Team_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Team" ("createdAt", "discordMatchReminderMinutes", "discordMentionRoleId", "discordPracticeReminderMinutes", "discordScrimReminderMinutes", "discordWebhookUrl", "game", "id", "logoUrl", "name", "orgId", "slug", "updatedAt") SELECT "createdAt", "discordMatchReminderMinutes", "discordMentionRoleId", "discordPracticeReminderMinutes", "discordScrimReminderMinutes", "discordWebhookUrl", "game", "id", "logoUrl", "name", "orgId", "slug", "updatedAt" FROM "Team";
DROP TABLE "Team";
ALTER TABLE "new_Team" RENAME TO "Team";
CREATE UNIQUE INDEX "Team_publicRosterToken_key" ON "Team"("publicRosterToken");
CREATE UNIQUE INDEX "Team_orgId_slug_key" ON "Team"("orgId", "slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
