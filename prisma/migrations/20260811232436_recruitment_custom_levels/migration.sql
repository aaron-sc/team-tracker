-- CreateTable
CREATE TABLE "ProspectLevel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProspectLevel_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProspectLevel_orgId_name_key" ON "ProspectLevel"("orgId", "name");

-- Backfill: turn each org's distinct existing `level` enum values into real
-- ProspectLevel rows, so prospects keep their level once the column becomes
-- a relation instead of a fixed enum.
INSERT INTO "ProspectLevel" ("id", "orgId", "name", "order", "createdAt")
SELECT
  lower(hex(randomblob(16))),
  "orgId",
  CASE "level"
    WHEN 'HIGH_SCHOOL' THEN 'High School'
    WHEN 'COLLEGE' THEN 'College'
    WHEN 'PRO' THEN 'Pro'
    ELSE "level"
  END,
  CASE "level"
    WHEN 'HIGH_SCHOOL' THEN 0
    WHEN 'COLLEGE' THEN 1
    WHEN 'PRO' THEN 2
    ELSE 0
  END,
  CURRENT_TIMESTAMP
FROM "RecruitmentProspect"
WHERE "level" IS NOT NULL
GROUP BY "orgId", "level";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RecruitmentProspect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "teamId" TEXT,
    "name" TEXT NOT NULL,
    "levelId" TEXT,
    "game" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'SCOUTING',
    "email" TEXT,
    "phone" TEXT,
    "discordHandle" TEXT,
    "schoolOrOrg" TEXT,
    "statsLinks" JSONB,
    "socialLinks" JSONB,
    "notes" TEXT,
    "assignedToMembershipId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecruitmentProspect_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecruitmentProspect_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecruitmentProspect_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "ProspectLevel" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecruitmentProspect_assignedToMembershipId_fkey" FOREIGN KEY ("assignedToMembershipId") REFERENCES "Membership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RecruitmentProspect" ("id", "orgId", "teamId", "name", "levelId", "game", "stage", "email", "phone", "discordHandle", "schoolOrOrg", "statsLinks", "socialLinks", "notes", "assignedToMembershipId", "createdAt", "updatedAt")
SELECT
  rp."id", rp."orgId", rp."teamId", rp."name",
  (
    SELECT pl."id" FROM "ProspectLevel" pl
    WHERE pl."orgId" = rp."orgId"
      AND pl."name" = CASE rp."level"
        WHEN 'HIGH_SCHOOL' THEN 'High School'
        WHEN 'COLLEGE' THEN 'College'
        WHEN 'PRO' THEN 'Pro'
        ELSE rp."level"
      END
  ),
  rp."game", rp."stage", rp."email", rp."phone", rp."discordHandle", rp."schoolOrOrg",
  rp."statsLinks", rp."socialLinks", rp."notes", rp."assignedToMembershipId", rp."createdAt", rp."updatedAt"
FROM "RecruitmentProspect" rp;
DROP TABLE "RecruitmentProspect";
ALTER TABLE "new_RecruitmentProspect" RENAME TO "RecruitmentProspect";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
