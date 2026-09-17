-- CreateTable
CREATE TABLE "OnboardingTaskExclusion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnboardingTaskExclusion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "OnboardingTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OnboardingTaskExclusion_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingTaskExclusion_taskId_membershipId_key" ON "OnboardingTaskExclusion"("taskId", "membershipId");
