import { prisma } from "@/lib/prisma";
import { SectorToggle } from "./SectorToggle";

export default async function AdminSectorsPage() {
  const sectors = await prisma.sector.findMany({
    orderBy: { label: "asc" },
    include: { _count: { select: { jobs: true } } },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-headline-lg text-primary">Sectors</h1>
        <p className="text-body-md text-on-surface-variant">
          The five approved sectors. Sectors cannot be created or deleted here — only activated or deactivated.
        </p>
      </div>

      <div className="space-y-3">
        {sectors.map((sector) => (
          <div
            key={sector.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant bg-surface p-5"
          >
            <div>
              <h2 className="text-body-lg font-bold text-primary">{sector.label}</h2>
              <p className="text-label-sm text-on-surface-variant">
                {sector._count.jobs} job{sector._count.jobs === 1 ? "" : "s"} · {sector.isActive ? "Active" : "Inactive"}
              </p>
            </div>
            <SectorToggle sectorId={sector.id} isActive={sector.isActive} />
          </div>
        ))}
      </div>
    </div>
  );
}
