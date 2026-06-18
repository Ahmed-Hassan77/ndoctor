-- CreateEnum
CREATE TYPE "ReviewModerationStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'FLAGGED');

-- AlterTable
ALTER TABLE "Rating" ADD COLUMN "moderationStatus" "ReviewModerationStatus" NOT NULL DEFAULT 'VISIBLE',
ADD COLUMN "hiddenAt" TIMESTAMP(3),
ADD COLUMN "hiddenBy" TEXT,
ADD COLUMN "hiddenReason" TEXT;

-- CreateIndex
CREATE INDEX "Rating_moderationStatus_idx" ON "Rating"("moderationStatus");

-- CreateIndex
CREATE INDEX "Rating_doctorId_moderationStatus_idx" ON "Rating"("doctorId", "moderationStatus");
