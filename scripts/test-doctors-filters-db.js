/**
 * Direct DB verification mirroring searchDoctors filter logic.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function count(where) {
  return prisma.user.count({ where: { role: "DOCTOR", verificationStatus: "VERIFIED", ...where } });
}

async function main() {
  const all = await count({});
  const ahmed = await count({
    OR: [
      { name: { contains: "Ahmed", mode: "insensitive" } },
      { nameEn: { contains: "Ahmed", mode: "insensitive" } },
      { nameAr: { contains: "Ahmed", mode: "insensitive" } },
    ],
  });
  const assiut = await count({
    OR: [
      { clinicGovernorateEn: { equals: "Assiut", mode: "insensitive" } },
      { clinicGovernorate: { equals: "Assiut", mode: "insensitive" } },
    ],
  });
  const cardio = await count({
    specialty: { equals: "Cardiology", mode: "insensitive" },
  });
  const endo = await count({
    specialty: { equals: "Endocrinology", mode: "insensitive" },
  });

  console.log("Filter counts (verified doctors):");
  console.log("  All:", all);
  console.log("  Name search 'Ahmed':", ahmed);
  console.log("  Governorate 'Assiut':", assiut);
  console.log("  Specialty Cardiology:", cardio);
  console.log("  Specialty Endocrinology:", endo);

  const profile = await prisma.user.findUnique({
    where: { id: "66a47cc9-daab-44f1-9b36-242c6449e490" },
    select: {
      nameEn: true,
      nameAr: true,
      specialty: true,
      descriptionEn: true,
      clinicGovernorateEn: true,
      clinicAreaEn: true,
      verificationStatus: true,
    },
  });
  console.log("\nProfile doctor sample:", JSON.stringify(profile, null, 2));

  if (all < 1) process.exitCode = 1;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
