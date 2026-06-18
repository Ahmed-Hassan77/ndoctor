-- AlterEnum: add CONFIRMED to AppointmentStatus
ALTER TYPE "AppointmentStatus" ADD VALUE 'CONFIRMED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "workTimeZone" TEXT;

-- CreateTable
CREATE TABLE "WorkTime" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkTime_doctorId_dayOfWeek_key" ON "WorkTime"("doctorId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "WorkTime_doctorId_idx" ON "WorkTime"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- AddForeignKey
ALTER TABLE "WorkTime" ADD CONSTRAINT "WorkTime_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prevent double-booking at same instant for same doctor
CREATE UNIQUE INDEX "Appointment_doctorId_startTime_key" ON "Appointment"("doctorId", "startTime");

-- Default slot duration (minutes)
INSERT INTO "SystemConfig" ("id", "key", "value", "description", "updatedAt")
VALUES ('cfg_slot_duration_seed', 'slot_duration', '30', 'Appointment slot length in minutes', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
