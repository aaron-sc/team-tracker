-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "discordInvite" TEXT,
    "games" TEXT NOT NULL,
    "rosterSize" TEXT,
    "reason" TEXT NOT NULL,
    "referral" TEXT,
    "ip" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "reviewedAt" DATETIME,
    "reviewedBy" TEXT,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AccessRequest_email_key" ON "AccessRequest"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AccessRequest_token_key" ON "AccessRequest"("token");
