-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DEACTIVATED');

-- AlterEnum
ALTER TYPE "AvailabilityExceptionType" ADD VALUE 'BREAK';
ALTER TYPE "AvailabilityExceptionType" ADD VALUE 'HOLIDAY';

-- AlterTable User
ALTER TABLE "User" ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "deactivatedBy" TEXT;

-- CreateTable Clinic
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "governorate" TEXT,
    "area" TEXT,
    "address" TEXT,
    "buildingInfo" TEXT,
    "phone" TEXT,
    "googleMapsUrl" TEXT,
    "consultationPriceEgp" INTEGER,
    "servicesOffered" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- AlterTable Appointment
ALTER TABLE "Appointment" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "clinicNameSnapshot" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "clinicAddressSnapshot" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "clinicPhoneSnapshot" TEXT;

-- AlterTable WorkTime
ALTER TABLE "WorkTime" ADD COLUMN "clinicScopeKey" TEXT NOT NULL DEFAULT 'global';
ALTER TABLE "WorkTime" ADD COLUMN "clinicId" TEXT;

-- AlterTable AvailabilityException
ALTER TABLE "AvailabilityException" ADD COLUMN "clinicId" TEXT;

-- Drop old WorkTime unique constraint
ALTER TABLE "WorkTime" DROP CONSTRAINT IF EXISTS "WorkTime_doctorId_dayOfWeek_mode_key";

-- CreateIndex
CREATE INDEX "Clinic_doctorId_isActive_idx" ON "Clinic"("doctorId", "isActive");
CREATE INDEX "WorkTime_clinicId_idx" ON "WorkTime"("clinicId");
CREATE INDEX "AvailabilityException_clinicId_idx" ON "AvailabilityException"("clinicId");

-- CreateIndex unique WorkTime
CREATE UNIQUE INDEX "WorkTime_doctorId_dayOfWeek_mode_clinicScopeKey_key" ON "WorkTime"("doctorId", "dayOfWeek", "mode", "clinicScopeKey");

-- AddForeignKey
ALTER TABLE "Clinic" ADD CONSTRAINT "Clinic_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkTime" ADD CONSTRAINT "WorkTime_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AvailabilityException" ADD CONSTRAINT "AvailabilityException_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate legacy clinic data from User to default Clinic records
INSERT INTO "Clinic" (
    "id",
    "doctorId",
    "name",
    "governorate",
    "area",
    "address",
    "buildingInfo",
    "phone",
    "googleMapsUrl",
    "consultationPriceEgp",
    "servicesOffered",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    u."id",
    COALESCE(NULLIF(TRIM(u."clinicArea"), ''), NULLIF(TRIM(u."clinicGovernorate"), ''), 'Main clinic'),
    NULLIF(TRIM(u."clinicGovernorate"), ''),
    NULLIF(TRIM(u."clinicArea"), ''),
    COALESCE(NULLIF(TRIM(u."clinicAddress"), ''), NULLIF(TRIM(u."practiceAddress"), '')),
    NULLIF(TRIM(u."clinicBuildingInfo"), ''),
    NULLIF(TRIM(u."clinicPhone"), ''),
    NULLIF(TRIM(u."clinicGoogleMapsUrl"), ''),
    u."clinicConsultationPriceEgp",
    NULLIF(TRIM(u."servicesOffered"), ''),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User" u
WHERE u."role" = 'DOCTOR'
  AND (
    NULLIF(TRIM(u."clinicGoogleMapsUrl"), '') IS NOT NULL
    OR (
      NULLIF(TRIM(u."clinicGovernorate"), '') IS NOT NULL
      AND NULLIF(TRIM(u."clinicArea"), '') IS NOT NULL
      AND COALESCE(NULLIF(TRIM(u."clinicAddress"), ''), NULLIF(TRIM(u."practiceAddress"), '')) IS NOT NULL
    )
  );

-- Ensure consultation duration defaults for existing doctors
UPDATE "User"
SET "consultationDurationMinutes" = 30
WHERE "role" = 'DOCTOR'
  AND ("consultationDurationMinutes" IS NULL OR "consultationDurationMinutes" < 5);
