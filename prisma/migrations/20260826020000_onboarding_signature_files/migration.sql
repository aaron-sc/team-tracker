-- AlterTable
ALTER TABLE "OnboardingCompletion" ADD COLUMN "signedFileName" TEXT;
ALTER TABLE "OnboardingCompletion" ADD COLUMN "signedFileUrl" TEXT;

-- AlterTable
ALTER TABLE "OnboardingTask" ADD COLUMN "fileName" TEXT;
ALTER TABLE "OnboardingTask" ADD COLUMN "fileUrl" TEXT;
