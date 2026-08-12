import "server-only";
import { prisma } from "@/lib/prisma";
import { JobStatus, EmploymentType, PayPeriod, ShiftCategory, SectorName } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

/**
 * The single canonical public job projection. Explicitly excludes `clientId`,
 * admin audit fields (`createdById`/`updatedById`), and application data —
 * every public page/query must go through this, never a hand-picked
 * `prisma.job.findMany` `select`.
 */
export const PUBLIC_JOB_SELECT = {
  id: true,
  slug: true,
  title: true,
  overview: true,
  shortDescription: true,
  employmentType: true,
  townOrCity: true,
  countyOrRegion: true,
  postcode: true,
  payType: true,
  currency: true,
  additionalPayInformation: true,
  referenceCode: true,
  startDate: true,
  closingDate: true,
  vacancyCount: true,
  hoursPerWeek: true,
  shiftSummary: true,
  additionalInformation: true,
  showPostedDate: true,
  featured: true,
  publishedAt: true,
  status: true,
  sector: { select: { id: true, name: true, label: true } },
  payRates: {
    select: { id: true, label: true, minimum: true, maximum: true, period: true, isPrimary: true, displayOrder: true },
    orderBy: { displayOrder: "asc" },
  },
  shifts: {
    select: { id: true, category: true, label: true, startTime: true, endTime: true, days: true, details: true },
    orderBy: { displayOrder: "asc" },
  },
  responsibilities: { select: { text: true }, orderBy: { displayOrder: "asc" } },
  requirements: { select: { text: true }, orderBy: { displayOrder: "asc" } },
  benefits: { select: { text: true }, orderBy: { displayOrder: "asc" } },
} satisfies Prisma.JobSelect;

export type PublicJob = Prisma.JobGetPayload<{ select: typeof PUBLIC_JOB_SELECT }>;

function publiclyVisibleWhere(now: Date): Prisma.JobWhereInput {
  return {
    status: JobStatus.PUBLISHED,
    OR: [{ startDate: null }, { startDate: { lte: now } }],
    AND: [{ OR: [{ closingDate: null }, { closingDate: { gte: now } }] }],
  };
}

export type SortOption = "newest" | "oldest" | "pay-asc" | "pay-desc";

export type JobFilters = {
  keyword?: string;
  location?: string;
  sectors?: SectorName[];
  employmentTypes?: EmploymentType[];
  shifts?: ShiftCategory[];
  payPeriod?: PayPeriod;
  minimumPay?: number;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
};

function buildWhere(filters: JobFilters, now: Date): Prisma.JobWhereInput {
  const where: Prisma.JobWhereInput = { ...publiclyVisibleWhere(now) };
  const and: Prisma.JobWhereInput[] = [];

  if (filters.keyword) {
    and.push({
      OR: [
        { title: { contains: filters.keyword, mode: "insensitive" } },
        { overview: { contains: filters.keyword, mode: "insensitive" } },
        { shortDescription: { contains: filters.keyword, mode: "insensitive" } },
        { referenceCode: { contains: filters.keyword, mode: "insensitive" } },
      ],
    });
  }

  if (filters.location) {
    and.push({
      OR: [
        { townOrCity: { contains: filters.location, mode: "insensitive" } },
        { countyOrRegion: { contains: filters.location, mode: "insensitive" } },
        { postcode: { contains: filters.location, mode: "insensitive" } },
      ],
    });
  }

  if (filters.sectors && filters.sectors.length > 0) {
    and.push({ sector: { name: { in: filters.sectors } } });
  }

  if (filters.employmentTypes && filters.employmentTypes.length > 0) {
    and.push({ employmentType: { in: filters.employmentTypes } });
  }

  if (filters.shifts && filters.shifts.length > 0) {
    and.push({ shifts: { some: { category: { in: filters.shifts } } } });
  }

  if (filters.payPeriod) {
    const payRateCondition: Prisma.JobPayRateWhereInput = { period: filters.payPeriod };
    if (filters.minimumPay !== undefined) {
      payRateCondition.OR = [
        { maximum: { gte: filters.minimumPay } },
        { AND: [{ maximum: null }, { minimum: { gte: filters.minimumPay } }] },
      ];
    }
    and.push({ payRates: { some: payRateCondition } });
  }

  if (and.length > 0) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), ...and];
  }

  return where;
}

function buildOrderBy(sort: SortOption | undefined): Prisma.JobOrderByWithRelationInput[] {
  switch (sort) {
    case "oldest":
      return [{ publishedAt: "asc" }];
    case "pay-asc":
    case "pay-desc":
      // Pay sort is applied in-memory after fetch (see getPublicJobs) since it
      // depends on the primary rate for the *selected* pay period, which
      // Prisma cannot express as a simple relation orderBy.
      return [{ publishedAt: "desc" }];
    case "newest":
    default:
      return [{ featured: "desc" }, { publishedAt: "desc" }];
  }
}

const DEFAULT_PAGE_SIZE = 10;

export async function getPublicJobs(filters: JobFilters, now: Date = new Date()) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const where = buildWhere(filters, now);

  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      select: PUBLIC_JOB_SELECT,
      orderBy: buildOrderBy(filters.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  let sortedJobs = jobs;
  if (filters.sort === "pay-asc" || filters.sort === "pay-desc") {
    sortedJobs = [...jobs].sort((a, b) => {
      const aRate = a.payRates.find((r) => r.isPrimary) ?? a.payRates[0];
      const bRate = b.payRates.find((r) => r.isPrimary) ?? b.payRates[0];
      const aValue = aRate ? Number(aRate.minimum) : Number.POSITIVE_INFINITY;
      const bValue = bRate ? Number(bRate.minimum) : Number.POSITIVE_INFINITY;
      return filters.sort === "pay-asc" ? aValue - bValue : bValue - aValue;
    });
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return { jobs: sortedJobs, total, page: Math.min(page, pageCount), pageCount, pageSize };
}

export async function getPublicJobBySlug(slug: string, now: Date = new Date()): Promise<PublicJob | null> {
  const job = await prisma.job.findFirst({
    where: { slug, ...publiclyVisibleWhere(now) },
    select: PUBLIC_JOB_SELECT,
  });
  return job;
}

/** Includes a closed/expired PUBLISHED job (for the "closed" safe state) but never DRAFT/ARCHIVED/unknown. */
export async function getJobBySlugForDetailPage(slug: string): Promise<(PublicJob & { isOpen: boolean }) | null> {
  const job = await prisma.job.findFirst({
    where: { slug, status: { in: [JobStatus.PUBLISHED, JobStatus.PAUSED, JobStatus.CLOSED] } },
    select: PUBLIC_JOB_SELECT,
  });
  if (!job) return null;

  const now = new Date();
  const isOpen =
    job.status === JobStatus.PUBLISHED &&
    (!job.startDate || job.startDate <= now) &&
    (!job.closingDate || job.closingDate >= now);

  return { ...job, isOpen };
}

export async function getSimilarJobs(job: Pick<PublicJob, "id" | "sector">, limit = 3, now: Date = new Date()) {
  return prisma.job.findMany({
    where: {
      ...publiclyVisibleWhere(now),
      sectorId: job.sector.id,
      id: { not: job.id },
    },
    select: PUBLIC_JOB_SELECT,
    orderBy: [{ publishedAt: "desc" }],
    take: limit,
  });
}
