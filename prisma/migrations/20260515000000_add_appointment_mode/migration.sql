-- CreateEnum
CREATE TYPE "AppointmentMode" AS ENUM ('ONLINE', 'OFFLINE');

-- AlterTable Availability
ALTER TABLE "Availability" ADD COLUMN "appointmentMode" "AppointmentMode" NOT NULL DEFAULT 'ONLINE';

-- AlterTable Appointment
ALTER TABLE "Appointment" ADD COLUMN "appointmentMode" "AppointmentMode" NOT NULL DEFAULT 'ONLINE';

-- AlterTable WorkTime: per-mode weekly rows
ALTER TABLE "WorkTime" ADD COLUMN "mode" "AppointmentMode" NOT NULL DEFAULT 'ONLINE';

DROP INDEX IF EXISTS "WorkTime_doctorId_dayOfWeek_key";

CREATE UNIQUE INDEX "WorkTime_doctorId_dayOfWeek_mode_key" ON "WorkTime"("doctorId", "dayOfWeek", "mode");
