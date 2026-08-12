import { prisma } from "../src/lib/prisma";
import { SectorName } from "../src/generated/prisma/enums";

const SECTORS: { name: SectorName; label: string }[] = [
  { name: SectorName.PRODUCTION, label: "Production" },
  { name: SectorName.WAREHOUSING, label: "Warehousing" },
  { name: SectorName.MANUFACTURING, label: "Manufacturing" },
  { name: SectorName.DISTRIBUTION, label: "Distribution" },
  { name: SectorName.AUTOMOTIVE, label: "Automotive" },
];

async function main() {
  for (const sector of SECTORS) {
    await prisma.sector.upsert({
      where: { name: sector.name },
      update: { label: sector.label },
      create: sector,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
