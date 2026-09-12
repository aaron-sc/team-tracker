
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "themeColor" TEXT NOT NULL DEFAULT '#EA580C',
    "apiKey" TEXT,
    "discordWebhookUrl" TEXT,
    "discordGuildId" TEXT,
    "websiteUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Organization" ("apiKey", "createdAt", "discordGuildId", "discordWebhookUrl", "id", "logoUrl", "name", "slug", "themeColor", "timezone", "updatedAt", "websiteUrl") SELECT "apiKey", "createdAt", "discordGuildId", "discordWebhookUrl", "id", "logoUrl", "name", "slug", "themeColor", "timezone", "updatedAt", "websiteUrl" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "Organization_apiKey_key" ON "Organization"("apiKey");
CREATE UNIQUE INDEX "Organization_discordGuildId_key" ON "Organization"("discordGuildId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

