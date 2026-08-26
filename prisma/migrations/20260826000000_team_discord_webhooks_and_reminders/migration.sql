-- AlterTable
ALTER TABLE "Match" ADD COLUMN "reminderSentAt" DATETIME;

-- AlterTable
ALTER TABLE "PracticeSession" ADD COLUMN "reminderSentAt" DATETIME;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN "discordMatchReminderMinutes" INTEGER;
ALTER TABLE "Team" ADD COLUMN "discordPracticeReminderMinutes" INTEGER;
ALTER TABLE "Team" ADD COLUMN "discordScrimReminderMinutes" INTEGER;
ALTER TABLE "Team" ADD COLUMN "discordWebhookUrl" TEXT;
