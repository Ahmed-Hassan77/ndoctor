-- CreateEnum
CREATE TYPE "AppointmentPaymentMethod" AS ENUM ('PAY_AT_CLINIC', 'ONLINE_CARD', 'MOBILE_WALLET', 'LEGACY_CREDITS');

-- CreateEnum
CREATE TYPE "AppointmentPaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- AlterTable User: EGP pricing
ALTER TABLE "User" ADD COLUMN "onlineConsultationPriceEgp" INTEGER DEFAULT 250;
ALTER TABLE "User" ADD COLUMN "clinicConsultationPriceEgp" INTEGER DEFAULT 300;
ALTER TABLE "User" ADD COLUMN "followUpPriceEgp" INTEGER;
ALTER TABLE "User" ADD COLUMN "consultationDurationMinutes" INTEGER DEFAULT 30;
ALTER TABLE "User" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EGP';

-- AlterTable User: structured clinic
ALTER TABLE "User" ADD COLUMN "clinicGovernorate" TEXT;
ALTER TABLE "User" ADD COLUMN "clinicArea" TEXT;
ALTER TABLE "User" ADD COLUMN "clinicAddress" TEXT;
ALTER TABLE "User" ADD COLUMN "clinicGoogleMapsUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "clinicPhone" TEXT;
ALTER TABLE "User" ADD COLUMN "clinicBuildingInfo" TEXT;

-- AlterTable User: professional profile
ALTER TABLE "User" ADD COLUMN "servicesOffered" TEXT;
ALTER TABLE "User" ADD COLUMN "education" TEXT;
ALTER TABLE "User" ADD COLUMN "languages" TEXT;
ALTER TABLE "User" ADD COLUMN "cancellationPolicy" TEXT;

-- Backfill defaults for existing doctors
UPDATE "User"
SET
  "onlineConsultationPriceEgp" = COALESCE("onlineConsultationPriceEgp", 250),
  "clinicConsultationPriceEgp" = COALESCE("clinicConsultationPriceEgp", 300),
  "consultationDurationMinutes" = COALESCE("consultationDurationMinutes", 30),
  "currency" = COALESCE(NULLIF("currency", ''), 'EGP')
WHERE "role" = 'DOCTOR';

-- AlterTable Appointment: payment snapshots
ALTER TABLE "Appointment" ADD COLUMN "priceSnapshotEgp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Appointment" ADD COLUMN "currencySnapshot" TEXT NOT NULL DEFAULT 'EGP';
ALTER TABLE "Appointment" ADD COLUMN "paymentMethod" "AppointmentPaymentMethod" NOT NULL DEFAULT 'PAY_AT_CLINIC';
ALTER TABLE "Appointment" ADD COLUMN "paymentStatus" "AppointmentPaymentStatus" NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "Appointment" ADD COLUMN "legacyCreditCost" INTEGER;

-- Backfill legacy online appointments (credits-based bookings)
UPDATE "Appointment"
SET
  "paymentMethod" = 'LEGACY_CREDITS',
  "paymentStatus" = 'PAID',
  "legacyCreditCost" = 2,
  "priceSnapshotEgp" = 250,
  "currencySnapshot" = 'EGP'
WHERE "appointmentMode" = 'ONLINE';

UPDATE "Appointment"
SET
  "paymentMethod" = 'PAY_AT_CLINIC',
  "paymentStatus" = 'UNPAID',
  "priceSnapshotEgp" = 300,
  "currencySnapshot" = 'EGP'
WHERE "appointmentMode" = 'OFFLINE';
