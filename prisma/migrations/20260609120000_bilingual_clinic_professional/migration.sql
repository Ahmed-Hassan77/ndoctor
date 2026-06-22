-- User: bilingual professional profile + building info
ALTER TABLE "User" ADD COLUMN "clinicBuildingInfoEn" TEXT;
ALTER TABLE "User" ADD COLUMN "clinicBuildingInfoAr" TEXT;
ALTER TABLE "User" ADD COLUMN "servicesOfferedEn" TEXT;
ALTER TABLE "User" ADD COLUMN "servicesOfferedAr" TEXT;
ALTER TABLE "User" ADD COLUMN "educationEn" TEXT;
ALTER TABLE "User" ADD COLUMN "educationAr" TEXT;
ALTER TABLE "User" ADD COLUMN "languagesEn" TEXT;
ALTER TABLE "User" ADD COLUMN "languagesAr" TEXT;
ALTER TABLE "User" ADD COLUMN "cancellationPolicyEn" TEXT;
ALTER TABLE "User" ADD COLUMN "cancellationPolicyAr" TEXT;

UPDATE "User" SET
  "clinicBuildingInfoEn" = "clinicBuildingInfo",
  "servicesOfferedEn" = "servicesOffered",
  "educationEn" = "education",
  "languagesEn" = "languages",
  "cancellationPolicyEn" = "cancellationPolicy"
WHERE "role" = 'DOCTOR';

-- Clinic: bilingual name + location
ALTER TABLE "Clinic" ADD COLUMN "nameEn" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "nameAr" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "governorateEn" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "governorateAr" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "areaEn" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "areaAr" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "addressEn" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "addressAr" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "buildingInfoEn" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "buildingInfoAr" TEXT;

UPDATE "Clinic" c SET
  "nameEn" = c."name",
  "governorateEn" = c."governorate",
  "areaEn" = c."area",
  "addressEn" = c."address",
  "buildingInfoEn" = c."buildingInfo"
FROM "User" u
WHERE c."doctorId" = u."id";

UPDATE "Clinic" c SET
  "governorateAr" = u."clinicGovernorateAr",
  "areaAr" = u."clinicAreaAr",
  "addressAr" = u."clinicAddressAr",
  "buildingInfoAr" = u."clinicBuildingInfoAr",
  "nameAr" = CASE
    WHEN u."nameAr" IS NOT NULL AND u."nameAr" <> '' THEN u."nameAr"
    ELSE NULL
  END
FROM "User" u
WHERE c."doctorId" = u."id"
  AND c."createdAt" = (
    SELECT MIN(c2."createdAt") FROM "Clinic" c2 WHERE c2."doctorId" = c."doctorId"
  );
