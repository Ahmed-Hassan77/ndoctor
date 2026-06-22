-- CreateEnum
CREATE TYPE "AppointmentRefundStatus" AS ENUM ('NONE', 'REFUND_REQUIRED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'NOT_ELIGIBLE');

-- CreateEnum
CREATE TYPE "MockPaymentMethod" AS ENUM ('CARD', 'MOBILE_WALLET', 'FAWRY_REFERENCE', 'PAY_AT_CLINIC');

-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- AlterEnum
ALTER TYPE "AppointmentPaymentMethod" ADD VALUE IF NOT EXISTS 'FAWRY_REFERENCE';

-- AlterEnum
ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "refundStatus" "AppointmentRefundStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN IF NOT EXISTS "refundAmountEgp" INTEGER,
ADD COLUMN IF NOT EXISTS "refundFeeEgp" INTEGER,
ADD COLUMN IF NOT EXISTS "refundReason" TEXT,
ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "refundedBy" TEXT;

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "grossAmountEgp" INTEGER,
ADD COLUMN IF NOT EXISTS "platformFeeEgp" INTEGER,
ADD COLUMN IF NOT EXISTS "netAmountEgp" INTEGER,
ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'EGP',
ADD COLUMN IF NOT EXISTS "payoutMethod" TEXT,
ADD COLUMN IF NOT EXISTS "payoutAccount" TEXT,
ADD COLUMN IF NOT EXISTS "adminNote" TEXT,
ALTER COLUMN "credits" SET DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "amountEgp" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "method" "MockPaymentMethod" NOT NULL,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'MOCK',
    "providerReference" TEXT,
    "failureReason" TEXT,
    "refundAmountEgp" INTEGER,
    "refundFeeEgp" INTEGER,
    "refundReason" TEXT,
    "refundedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentTransaction_appointmentId_idx" ON "PaymentTransaction"("appointmentId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_patientId_idx" ON "PaymentTransaction"("patientId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
