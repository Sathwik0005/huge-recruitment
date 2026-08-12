import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JobStatus, EmploymentType } from "@/generated/prisma/enums";
import { AdminJobsTable } from "./AdminJobsTable";

const STATUS_VALUES = Object.values(JobStatus);
const EMPLOYMENT_TYPE_VALUES = Object.values(EmploymentType);

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const status = STATUS_VALUES.includes(params.status as JobStatus) ? (params.status as JobStatus) : undefined;
  const employmentType = EMPLOYMENT_TYPE_VALUES.includes(params.employmentType as EmploymentType)
    ? (params.employmentType as EmploymentType)
    : undefined;
  const search = params.search?.trim();

  const [jobs, sectors] = await Promise.all([
    prisma.job.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(employmentType ? { employmentType } : {}),
        ...(params.sectorId ? { sectorId: params.sectorId } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { townOrCity: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        sector: { select: { label: true } },
        payRates: true,
        _count: { select: { applications: true } },
      },
      take: 50,
    }),
    prisma.sector.findMany({ orderBy: { label: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-headline-lg text-primary">Jobs</h1>
        <Link
          href="/admin/jobs/new"
          className="h-11 px-6 flex items-center bg-primary text-on-primary text-label-md font-bold rounded-lg hover:bg-secondary hover:text-on-secondary transition-all"
        >
          + New job
        </Link>
      </div>

      <form className="flex flex-wrap gap-3 rounded-lg border border-outline-variant bg-surface p-4" method="get">
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Search title or location"
          className="h-11 px-4 flex-1 min-w-[200px] bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md"
        />
        <select name="status" defaultValue={status ?? ""} className="h-11 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md">
          <option value="">Any status</option>
          {STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          name="employmentType"
          defaultValue={employmentType ?? ""}
          className="h-11 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md"
        >
          <option value="">Any employment type</option>
          {EMPLOYMENT_TYPE_VALUES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          name="sectorId"
          defaultValue={params.sectorId ?? ""}
          className="h-11 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md"
        >
          <option value="">Any sector</option>
          {sectors.map((sector) => (
            <option key={sector.id} value={sector.id}>
              {sector.label}
            </option>
          ))}
        </select>
        <button type="submit" className="h-11 px-5 rounded-lg border border-primary text-primary font-bold">
          Filter
        </button>
      </form>

      <AdminJobsTable jobs={jobs} />
    </div>
  );
}
