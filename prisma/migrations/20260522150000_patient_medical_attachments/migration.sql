-- CreateEnum
CREATE TYPE "MedicalAttachmentCategory" AS ENUM ('LAB_TEST', 'RADIOLOGY', 'PRESCRIPTION', 'REPORT', 'OTHER');

-- CreateTable
CREATE TABLE "PatientMedicalAttachment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "category" "MedicalAttachmentCategory" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientMedicalAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientMedicalAttachment_patientId_idx" ON "PatientMedicalAttachment"("patientId");

-- AddForeignKey
ALTER TABLE "PatientMedicalAttachment" ADD CONSTRAINT "PatientMedicalAttachment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
