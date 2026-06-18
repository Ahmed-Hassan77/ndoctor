const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.systemConfig.upsert({
    where: { key: "slot_duration" },
    update: {},
    create: {
      key: "slot_duration",
      value: "30",
      description: "Appointment slot length in minutes",
    },
  });
}

main()
  .then(() => console.log("Seed completed"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
