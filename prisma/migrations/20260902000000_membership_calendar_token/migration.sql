-- AlterTable
ALTER TABLE "Membership" ADD COLUMN "calendarToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Membership_calendarToken_key" ON "Membership"("calendarToken");

