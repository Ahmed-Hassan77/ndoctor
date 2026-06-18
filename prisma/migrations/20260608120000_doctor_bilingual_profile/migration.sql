-- Bilingual public doctor profile fields (EN + AR)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nameAr" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "specialtyAr" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "descriptionEn" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "descriptionAr" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clinicGovernorateEn" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clinicGovernorateAr" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clinicAreaEn" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clinicAreaAr" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clinicAddressEn" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clinicAddressAr" TEXT;

-- Backfill English fields from legacy columns
UPDATE "User"
SET
  "nameEn" = COALESCE("nameEn", "name"),
  "descriptionEn" = COALESCE("descriptionEn", "description"),
  "clinicGovernorateEn" = COALESCE("clinicGovernorateEn", "clinicGovernorate"),
  "clinicAreaEn" = COALESCE("clinicAreaEn", "clinicArea"),
  "clinicAddressEn" = COALESCE("clinicAddressEn", "clinicAddress")
WHERE role = 'DOCTOR';
