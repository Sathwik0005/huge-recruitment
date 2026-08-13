import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getPublicJobs, type JobFilters as JobFiltersType, type SortOption } from "@/lib/job-dto";
import { SectorName, EmploymentType, PayPeriod, ShiftCategory } from "@/generated/prisma/enums";
import { JobFilters } from "./JobFilters";
import { JobCard } from "./JobCard";
import { JobPagination } from "./JobPagination";
import { EmptyJobsState } from "./EmptyJobsState";

function parseList<T extends string>(value: string | undefined, allowed: readonly T[]): T[] {
  if (!value) return [];
  return value.split(",").filter((v): v is T => (allowed as readonly string[]).includes(v));
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const sectorValues = Object.values(SectorName);
  const employmentTypeValues = Object.values(EmploymentType);
  const shiftValues = Object.values(ShiftCategory);
  const payPeriodValues = Object.values(PayPeriod);
  const sortValues: SortOption[] = ["newest", "oldest", "pay-asc", "pay-desc"];

  const payPeriod = payPeriodValues.includes(params.payPeriod as PayPeriod) ? (params.payPeriod as PayPeriod) : undefined;
  const minimumPayRaw = params.minimumPay ? Number(params.minimumPay) : undefined;
  const sort = sortValues.includes(params.sort as SortOption) ? (params.sort as SortOption) : "newest";
  const pageParam = Number(params.page);

  const filters: JobFiltersType = {
    keyword: params.keyword?.trim() || undefined,
    location: params.location?.trim() || undefined,
    sectors: parseList(params.sector, sectorValues),
    employmentTypes: parseList(params.employmentType, employmentTypeValues),
    shifts: parseList(params.shift, shiftValues),
    payPeriod,
    minimumPay: payPeriod && minimumPayRaw && !Number.isNaN(minimumPayRaw) ? minimumPayRaw : undefined,
    sort: (payPeriod ? sort : sort === "pay-asc" || sort === "pay-desc" ? "newest" : sort) as SortOption,
    page: Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1,
  };

  const [{ jobs, total, page, pageCount }, sectors] = await Promise.all([
    getPublicJobs(filters),
    prisma.sector.findMany({ where: { isActive: true }, orderBy: { label: "asc" }, select: { name: true, label: true } }),
  ]);

  const hasFilters = Boolean(
    filters.keyword ||
      filters.location ||
      (filters.sectors && filters.sectors.length > 0) ||
      (filters.employmentTypes && filters.employmentTypes.length > 0) ||
      (filters.shifts && filters.shifts.length > 0) ||
      filters.payPeriod
  );

  return (
    <main className="mx-auto w-full max-w-container-max px-margin-mobile py-10 md:px-margin-desktop md:py-14">
      <header className="mb-8 max-w-3xl md:mb-10">
        <h1 className="mb-3 font-headline-lg text-headline-lg text-primary md:text-[40px] md:leading-[48px]">
          Find your next opportunity
        </h1>
        <p className="text-body-md text-on-surface-variant md:text-body-lg">
          Explore roles across production, warehousing, manufacturing, distribution and automotive workplaces.
        </p>
      </header>

      <Suspense>
        <JobFilters sectors={sectors}>
          <section aria-labelledby="job-results-heading" className="min-w-0">

            {jobs.length === 0 ? (
              <EmptyJobsState hasFilters={hasFilters} />
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}

            <JobPagination page={page} pageCount={pageCount} searchParams={params} />
          </section>
        </JobFilters>
      </Suspense>

      <p className="sr-only" aria-live="polite">
        {total} jobs found
      </p>
    </main>
  );
}
