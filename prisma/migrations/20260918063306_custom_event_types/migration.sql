-- CreateTable
CREATE TABLE "EventType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trackAttendance" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventType_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PracticeSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PRACTICE',
    "opponentId" TEXT,
    "eventTypeId" TEXT,
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
    CONSTRAINT "PracticeSession_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PracticeSession_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PracticeSession" ("createdAt", "createdById", "durationMinutes", "id", "locationType", "notes", "opponentId", "resultStatus", "scheduledAt", "scoreAgainst", "scoreFor", "sentReminderMinutes", "teamId", "timezone", "type", "updatedAt", "venueId") SELECT "createdAt", "createdById", "durationMinutes", "id", "locationType", "notes", "opponentId", "resultStatus", "scheduledAt", "scoreAgainst", "scoreFor", "sentReminderMinutes", "teamId", "timezone", "type", "updatedAt", "venueId" FROM "PracticeSession";
DROP TABLE "PracticeSession";
ALTER TABLE "new_PracticeSession" RENAME TO "PracticeSession";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EventType_orgId_name_key" ON "EventType"("orgId", "name");
