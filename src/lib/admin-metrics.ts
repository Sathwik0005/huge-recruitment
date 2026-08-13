import "server-only";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus, JobStatus, SectorName } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export type CandidateVerification = "verified" | "pending" | "inactive";

/**
 * There is no stored verification field — "Candidates" is `JobApplication`
 * restyled (spec 04-admin-panel, decision 2). This mapping is the single
 * source of truth for that derivation; both display code and the query-side
 * `VERIFICATION_STATUS_GROUPS` below must always agree with it.
 */
export function deriveCandidateVerification(status: ApplicationStatus): CandidateVerification {
  switch (status) {
    case ApplicationStatus.SHORTLISTED:
    case ApplicationStatus.HIRED:
      return "verified";
    case ApplicationStatus.REJECTED:
    case ApplicationStatus.WITHDRAWN:
      return "inactive";
    case ApplicationStatus.NEW:
    case ApplicationStatus.REVIEWING:
    default:
      return "pending";
  }
}

/** Query-side mirror of `deriveCandidateVerification` — a Prisma `where` can't call a JS function. */
export const VERIFICATION_STATUS_GROUPS: Record<CandidateVerification, ApplicationStatus[]> = {
  verified: [ApplicationStatus.SHORTLISTED, ApplicationStatus.HIRED],
  pending: [ApplicationStatus.NEW, ApplicationStatus.REVIEWING],
  inactive: [ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN],
};

export async function getTotalCandidates(): Promise<number> {
  return prisma.jobApplication.count();
}

export async function getActiveJobsCount(): Promise<number> {
  return prisma.job.count({ where: { status: JobStatus.PUBLISHED } });
}

export async function getPlacementRate(): Promise<number> {
  const [hired, total] = await Promise.all([
    prisma.jobApplication.count({ where: { status: ApplicationStatus.HIRED } }),
    prisma.jobApplication.count(),
  ]);
  if (total === 0) return 0;
  return Math.round((hired / total) * 100);
}

export async function getPendingVerificationsCount(): Promise<number> {
  return prisma.jobApplication.count({ where: { status: { in: VERIFICATION_STATUS_GROUPS.pending } } });
}

export async function getApplicationStatusDistribution(): Promise<Record<ApplicationStatus, number>> {
  const groups = await prisma.jobApplication.groupBy({ by: ["status"], _count: true });
  const counts = new Map(groups.map((g) => [g.status, g._count]));
  const distribution = {} as Record<ApplicationStatus, number>;
  for (const status of Object.values(ApplicationStatus)) {
    distribution[status] = counts.get(status) ?? 0;
  }
  return distribution;
}

export async function getJobStatusCounts(): Promise<Record<JobStatus, number>> {
  const groups = await prisma.job.groupBy({ by: ["status"], _count: true });
  const counts = new Map(groups.map((g) => [g.status, g._count]));
  const distribution = {} as Record<JobStatus, number>;
  for (const status of Object.values(JobStatus)) {
    distribution[status] = counts.get(status) ?? 0;
  }
  return distribution;
}

const RECENT_APPLICATION_SELECT = {
  id: true,
  fullName: true,
  email: true,
  status: true,
  createdAt: true,
  job: { select: { id: true, title: true } },
} satisfies Prisma.JobApplicationSelect;

export type RecentApplication = Prisma.JobApplicationGetPayload<{ select: typeof RECENT_APPLICATION_SELECT }>;

export async function getRecentApplications(limit = 5): Promise<RecentApplication[]> {
  return prisma.jobApplication.findMany({
    select: RECENT_APPLICATION_SELECT,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getAvgTimeToFillDays(): Promise<number | null> {
  const jobs = await prisma.job.findMany({
    where: { closedAt: { not: null }, publishedAt: { not: null } },
    select: { closedAt: true, publishedAt: true },
  });
  if (jobs.length === 0) return null;

  const totalDays = jobs.reduce((sum, job) => {
    const days = (job.closedAt!.getTime() - job.publishedAt!.getTime()) / 86_400_000;
    return sum + days;
  }, 0);
  return Math.round(totalDays / jobs.length);
}

export async function getTotalPlacementsYtd(): Promise<number> {
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  return prisma.jobApplication.count({
    where: { status: ApplicationStatus.HIRED, createdAt: { gte: startOfYear } },
  });
}

export async function getTotalActiveEmployers(): Promise<number> {
  return prisma.client.count({ where: { isActive: true } });
}

export type SectorApplicationCount = { sector: SectorName; label: string; count: number };

export async function getApplicationsBySector(): Promise<SectorApplicationCount[]> {
  const sectors = await prisma.sector.findMany({
    orderBy: { label: "asc" },
    select: {
      name: true,
      label: true,
      jobs: { select: { _count: { select: { applications: true } } } },
    },
  });

  return sectors.map((sector) => ({
    sector: sector.name,
    label: sector.label,
    count: sector.jobs.reduce((sum, job) => sum + job._count.applications, 0),
  }));
}

export type TopEmployer = { id: string; name: string; sectorLabel: string | null; placementCount: number };

export async function getTopEmployers(limit = 5): Promise<TopEmployer[]> {
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      jobs: {
        select: {
          sector: { select: { label: true } },
          applications: { where: { status: ApplicationStatus.HIRED }, select: { id: true } },
        },
      },
    },
  });

  return clients
    .map((client) => {
      let placementCount = 0;
      let topSectorLabel: string | null = null;
      let topJobPlacements = 0;
      for (const job of client.jobs) {
        const jobPlacements = job.applications.length;
        placementCount += jobPlacements;
        if (jobPlacements > topJobPlacements) {
          topJobPlacements = jobPlacements;
          topSectorLabel = job.sector.label;
        }
      }
      return { id: client.id, name: client.name, sectorLabel: topSectorLabel, placementCount };
    })
    .filter((client) => client.placementCount > 0)
    .sort((a, b) => b.placementCount - a.placementCount)
    .slice(0, limit);
}

export type TopPerformingRole = {
  id: string;
  title: string;
  applicantCount: number;
  avgDaysToFill: number | null;
};

export async function getTopPerformingRoles(limit = 5): Promise<TopPerformingRole[]> {
  const jobs = await prisma.job.findMany({
    orderBy: { applications: { _count: "desc" } },
    take: limit,
    select: {
      id: true,
      title: true,
      publishedAt: true,
      closedAt: true,
      _count: { select: { applications: true } },
    },
  });

  return jobs.map((job) => ({
    id: job.id,
    title: job.title,
    applicantCount: job._count.applications,
    avgDaysToFill:
      job.closedAt && job.publishedAt
        ? Math.round((job.closedAt.getTime() - job.publishedAt.getTime()) / 86_400_000)
        : null,
  }));
}

export type CandidateFilters = {
  search?: string;
  sectorId?: string;
  verification?: CandidateVerification;
};

/** Shared between `candidates/page.tsx` and the CSV export route so filter logic is defined exactly once. */
export function buildCandidateWhere(filters: CandidateFilters): Prisma.JobApplicationWhereInput {
  const where: Prisma.JobApplicationWhereInput = {};
  const and: Prisma.JobApplicationWhereInput[] = [];

  if (filters.search) {
    and.push({
      OR: [
        { fullName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ],
    });
  }

  if (filters.sectorId) {
    and.push({ job: { sectorId: filters.sectorId } });
  }

  if (filters.verification) {
    and.push({ status: { in: VERIFICATION_STATUS_GROUPS[filters.verification] } });
  }

  if (and.length > 0) where.AND = and;
  return where;
}
