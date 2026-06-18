-- CreateEnum
CREATE TYPE "AppointmentCompletionSource" AS ENUM ('DOCTOR', 'PATIENT', 'BOTH', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AppointmentDisputeStatus" AS ENUM ('NONE', 'OPEN', 'RESOLVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "doctorMarkedCompletedAt" TIMESTAMP(3),
ADD COLUMN "patientConfirmedCompletedAt" TIMESTAMP(3),
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "completionSource" "AppointmentCompletionSource",
ADD COLUMN "adminCompletionNote" TEXT,
ADD COLUMN "patientNoShowReportedAt" TIMESTAMP(3),
ADD COLUMN "doctorNoShowReportedAt" TIMESTAMP(3),
ADD COLUMN "noShowReason" TEXT,
ADD COLUMN "disputeStatus" "AppointmentDisputeStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "disputeReason" TEXT,
ADD COLUMN "disputeOpenedAt" TIMESTAMP(3),
ADD COLUMN "disputeResolvedAt" TIMESTAMP(3),
ADD COLUMN "disputeResolvedBy" TEXT,
ADD COLUMN "disputeResolutionNote" TEXT,
ADD COLUMN "clinicPaymentReceivedAt" TIMESTAMP(3),
ADD COLUMN "clinicPaymentReceivedBy" TEXT,
ADD COLUMN "clinicAttendanceConfirmedAt" TIMESTAMP(3),
ADD COLUMN "patientJoinedVideoAt" TIMESTAMP(3),
ADD COLUMN "doctorJoinedVideoAt" TIMESTAMP(3),
ADD COLUMN "patientLastSeenVideoAt" TIMESTAMP(3),
ADD COLUMN "doctorLastSeenVideoAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Appointment_disputeStatus_idx" ON "Appointment"("disputeStatus");

-- CreateTable
CREATE TABLE "VisitSummary" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "diagnosis" TEXT,
    "prescription" TEXT,
    "recommendations" TEXT,
    "followUpInstructions" TEXT,
    "followUpDate" TIMESTAMP(3),
    "patientFriendlySummary" TEXT,
    "redFlags" TEXT,
    "privateDoctorNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitSummary_appointmentId_key" ON "VisitSummary"("appointmentId");

-- CreateIndex
CREATE INDEX "VisitSummary_doctorId_idx" ON "VisitSummary"("doctorId");

-- CreateIndex
CREATE INDEX "VisitSummary_patientId_idx" ON "VisitSummary"("patientId");

-- AddForeignKey
ALTER TABLE "VisitSummary" ADD CONSTRAINT "VisitSummary_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
