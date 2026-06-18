/**
 * One-off migration verification script.
 * Run: node scripts/verify-bilingual-migration.js
 */
const { PrismaClient } = require("@prisma/client");

const BILINGUAL_COLUMNS = [
  "nameEn",
  "nameAr",
  "specialtyAr",
  "descriptionEn",
  "descriptionAr",
  "clinicGovernorateEn",
  "clinicGovernorateAr",
  "clinicAreaEn",
  "clinicAreaAr",
  "clinicAddressEn",
  "clinicAddressAr",
];

async function main() {
  const prisma = new PrismaClient();

  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'User'
        AND column_name = ANY(${BILINGUAL_COLUMNS})
      ORDER BY column_name
    `;

    const found = columns.map((c) => c.column_name);
    const missing = BILINGUAL_COLUMNS.filter((c) => !found.includes(c));

    console.log("=== Bilingual columns in User table ===");
    console.log(JSON.stringify(columns, null, 2));
    console.log(`Found: ${found.length}/${BILINGUAL_COLUMNS.length}`);
    if (missing.length) {
      console.error("MISSING columns:", missing);
      process.exitCode = 1;
    } else {
      console.log("All bilingual columns present.");
    }

    const doctorCount = await prisma.user.count({
      where: { role: "DOCTOR", verificationStatus: "VERIFIED" },
    });

    const backfillSample = await prisma.user.findMany({
      where: { role: "DOCTOR" },
      select: {
        id: true,
        name: true,
        nameEn: true,
        nameAr: true,
        description: true,
        descriptionEn: true,
        descriptionAr: true,
        clinicGovernorate: true,
        clinicGovernorateEn: true,
        clinicAreaEn: true,
        clinicAddressEn: true,
      },
      take: 5,
    });

    console.log("\n=== Verified doctors count ===");
    console.log(doctorCount);

    console.log("\n=== Backfill sample (first 5 doctors) ===");
    for (const d of backfillSample) {
      const enOk =
        d.nameEn != null &&
        (d.descriptionEn != null || d.description == null) &&
        (d.clinicGovernorateEn != null || d.clinicGovernorate == null);
      console.log(
        JSON.stringify({
          id: d.id,
          name: d.name,
          nameEn: d.nameEn,
          nameAr: d.nameAr,
          descriptionEn: d.descriptionEn?.slice(0, 40),
          clinicGovernorateEn: d.clinicGovernorateEn,
          enBackfillOk: enOk,
        })
      );
    }

    const searchTest = await prisma.user.findMany({
      where: {
        role: "DOCTOR",
        verificationStatus: "VERIFIED",
        OR: [
          { nameEn: { contains: "a", mode: "insensitive" } },
          { nameAr: { contains: "ا", mode: "insensitive" } },
        ],
      },
      select: { id: true, nameEn: true, nameAr: true },
      take: 3,
    });
    console.log("\n=== Bilingual search query test ===");
    console.log(`Results: ${searchTest.length}`);

    const filterOptions = await prisma.user.findMany({
      where: { role: "DOCTOR", verificationStatus: "VERIFIED" },
      select: {
        clinicGovernorateEn: true,
        clinicGovernorateAr: true,
        clinicAreaEn: true,
        clinicAreaAr: true,
        specialty: true,
      },
    });
    const govSet = new Set();
    for (const r of filterOptions) {
      const g = (r.clinicGovernorateEn ?? "").trim();
      if (g) govSet.add(g);
    }
    console.log("\n=== Filter options (governorates) ===");
    console.log([...govSet].sort().join(", ") || "(none)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
