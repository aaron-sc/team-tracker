-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "discordGuildId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "discordUserId" TEXT;

-- CreateTable
CREATE TABLE "DiscordLinkCode" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "discordUserId" TEXT NOT NULL,
    "discordUsername" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DiscordGuildLinkCode" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "guildName" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_discordGuildId_key" ON "Organization"("discordGuildId");

-- CreateIndex
CREATE UNIQUE INDEX "User_discordUserId_key" ON "User"("discordUserId");

