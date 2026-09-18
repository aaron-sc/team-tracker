/*
  Warnings:

  - You are about to drop the column `reminderSentAt` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `reminderSentAt` on the `PracticeSession` table. All the data in the column will be lost.
  - You are about to alter the column `discordMatchReminderMinutes` on the `Team` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Json`.
  - You are about to alter the column `discordPracticeReminderMinutes` on the `Team` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Json`.
  - You are about to alter the column `discordScrimReminderMinutes` on the `Team` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Json`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "timezone" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'BO1',
    "locationType" TEXT NOT NULL DEFAULT 'ONLINE',
    "venueId" TEXT,
    "isStreamed" BOOLEAN NOT NULL DEFAULT false,
    "streamPlatform" TEXT,
    "streamUrl" TEXT,
    "casterName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "resultStatus" TEXT,
    "scoreFor" INTEGER,
    "scoreAgainst" INTEGER,
    "notes" TEXT,
    "sentReminderMinutes" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Match_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "Opponent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("casterName", "createdAt", "createdById", "format", "id", "isStreamed", "locationType", "notes", "opponentId", "resultStatus", "scheduledAt", "scoreAgainst", "scoreFor", "status", "streamPlatform", "streamUrl", "teamId", "timezone", "updatedAt", "venueId") SELECT "casterName", "createdAt", "createdById", "format", "id", "isStreamed", "locationType", "notes", "opponentId", "resultStatus", "scheduledAt", "scoreAgainst", "scoreFor", "status", "streamPlatform", "streamUrl", "teamId", "timezone", "updatedAt", "venueId" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE TABLE "new_PracticeSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PRACTICE',
    "opponentId" TEXT,
    "scheduledAt" DATETIME NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "timezone" TEXT NOT NULL,
    "locationType" TEXT NOT NULL DEFAULT 'ONLINE',
    "venueId" TEXT,
    "notes" TEXT,
    "sentReminderMinutes" JSONB,
    "resultStatus" TEXT,
    "scoreFor" INTEGER,
    "scoreAgainst" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PracticeSession_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PracticeSession_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "Opponent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PracticeSession_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PracticeSession" ("createdAt", "createdById", "durationMinutes", "id", "locationType", "notes", "opponentId", "resultStatus", "scheduledAt", "scoreAgainst", "scoreFor", "teamId", "timezone", "type", "updatedAt", "venueId") SELECT "createdAt", "createdById", "durationMinutes", "id", "locationType", "notes", "opponentId", "resultStatus", "scheduledAt", "scoreAgainst", "scoreFor", "teamId", "timezone", "type", "updatedAt", "venueId" FROM "PracticeSession";
DROP TABLE "PracticeSession";
ALTER TABLE "new_PracticeSession" RENAME TO "PracticeSession";
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
    "discordMatchReminderMinutes" JSONB,
    "discordPracticeReminderMinutes" JSONB,
    "discordScrimReminderMinutes" JSONB,
    "discordNotifyOnCreate" BOOLEAN NOT NULL DEFAULT false,
    "discordReminderChannelId" TEXT,
    "discordRoleId" TEXT,
    "publicRosterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publicRosterToken" TEXT,
    "playerEditableFields" JSONB,
    CONSTRAINT "Team_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Team" ("createdAt", "discordMatchReminderMinutes", "discordMentionRoleId", "discordPracticeReminderMinutes", "discordReminderChannelId", "discordRoleId", "discordScrimReminderMinutes", "discordWebhookUrl", "game", "id", "logoUrl", "name", "orgId", "playerEditableFields", "publicRosterEnabled", "publicRosterToken", "slug", "updatedAt") SELECT "createdAt", "discordMatchReminderMinutes", "discordMentionRoleId", "discordPracticeReminderMinutes", "discordReminderChannelId", "discordRoleId", "discordScrimReminderMinutes", "discordWebhookUrl", "game", "id", "logoUrl", "name", "orgId", "playerEditableFields", "publicRosterEnabled", "publicRosterToken", "slug", "updatedAt" FROM "Team";
DROP TABLE "Team";
ALTER TABLE "new_Team" RENAME TO "Team";
CREATE UNIQUE INDEX "Team_publicRosterToken_key" ON "Team"("publicRosterToken");
CREATE UNIQUE INDEX "Team_orgId_slug_key" ON "Team"("orgId", "slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
