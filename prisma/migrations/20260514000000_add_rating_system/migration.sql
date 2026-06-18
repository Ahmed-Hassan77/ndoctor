-- AlterTable User
ALTER TABLE "User" ADD COLUMN "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "totalReviews" INTEGER NOT NULL DEFAULT 0;

-- AlterTable Appointment
ALTER TABLE "Appointment" ADD COLUMN "isPaid" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable Rating
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "value" SMALLINT NOT NULL,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rating_appointmentId_key" ON "Rating"("appointmentId");

-- CreateIndex
CREATE INDEX "Rating_doctorId_idx" ON "Rating"("doctorId");

-- CreateIndex
CREATE INDEX "Rating_patientId_idx" ON "Rating"("patientId");

-- CreateIndex
CREATE INDEX "Rating_appointmentId_idx" ON "Rating"("appointmentId");

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
