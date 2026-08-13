import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobApplication: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    job: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    client: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    sector: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { ApplicationStatus, JobStatus, SectorName } from "@/generated/prisma/enums";
import {
  deriveCandidateVerification,
  VERIFICATION_STATUS_GROUPS,
  buildCandidateWhere,
  getTotalCandidates,
  getActiveJobsCount,
  getPlacementRate,
  getPendingVerificationsCount,
  getApplicationStatusDistribution,
  getJobStatusCounts,
  getRecentApplications,
  getAvgTimeToFillDays,
  getTotalPlacementsYtd,
  getTotalActiveEmployers,
  getApplicationsBySector,
  getTopEmployers,
  getTopPerformingRoles,
} from "./admin-metrics";

const mockJobApplicationCount = vi.mocked(prisma.jobApplication.count);
const mockJobApplicationGroupBy = vi.mocked(prisma.jobApplication.groupBy);
const mockJobApplicationFindMany = vi.mocked(prisma.jobApplication.findMany);
const mockJobCount = vi.mocked(prisma.job.count);
const mockJobGroupBy = vi.mocked(prisma.job.groupBy);
const mockJobFindMany = vi.mocked(prisma.job.findMany);
const mockClientCount = vi.mocked(prisma.client.count);
const mockClientFindMany = vi.mocked(prisma.client.findMany);
const mockSectorFindMany = vi.mocked(prisma.sector.findMany);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deriveCandidateVerification", () => {
  it.each([
    [ApplicationStatus.SHORTLISTED, "verified"],
    [ApplicationStatus.HIRED, "verified"],
    [ApplicationStatus.NEW, "pending"],
    [ApplicationStatus.REVIEWING, "pending"],
    [ApplicationStatus.REJECTED, "inactive"],
    [ApplicationStatus.WITHDRAWN, "inactive"],
  ] as const)("maps %s to %s", (status, expected) => {
    expect(deriveCandidateVerification(status)).toBe(expected);
  });
});

describe("VERIFICATION_STATUS_GROUPS", () => {
  it("agrees exactly with deriveCandidateVerification for every ApplicationStatus value", () => {
    for (const status of Object.values(ApplicationStatus)) {
      const expectedGroup = deriveCandidateVerification(status);
      expect(VERIFICATION_STATUS_GROUPS[expectedGroup]).toContain(status);
    }
  });

  it("has no overlap between groups", () => {
    const verified = new Set(VERIFICATION_STATUS_GROUPS.verified);
    const pending = new Set(VERIFICATION_STATUS_GROUPS.pending);
    const inactive = new Set(VERIFICATION_STATUS_GROUPS.inactive);
    for (const s of verified) {
      expect(pending.has(s)).toBe(false);
      expect(inactive.has(s)).toBe(false);
    }
    for (const s of pending) {
      expect(inactive.has(s)).toBe(false);
    }
  });
});

describe("getTotalCandidates", () => {
  it("counts all job applications with no filter", async () => {
    mockJobApplicationCount.mockResolvedValue(42);
    const result = await getTotalCandidates();
    expect(result).toBe(42);
    expect(mockJobApplicationCount).toHaveBeenCalledWith();
  });
});

describe("getActiveJobsCount", () => {
  it("counts only PUBLISHED jobs", async () => {
    mockJobCount.mockResolvedValue(7);
    const result = await getActiveJobsCount();
    expect(result).toBe(7);
    expect(mockJobCount).toHaveBeenCalledWith({ where: { status: "PUBLISHED" } });
  });
});

describe("getPlacementRate", () => {
  it("returns 0 (not NaN/Infinity) when there are zero applications", async () => {
    mockJobApplicationCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    const result = await getPlacementRate();
    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });

  it("returns the rounded whole-percent HIRED rate", async () => {
    mockJobApplicationCount.mockResolvedValueOnce(1).mockResolvedValueOnce(3);
    const result = await getPlacementRate();
    expect(result).toBe(33);
  });

  it("rounds to nearest whole percent", async () => {
    mockJobApplicationCount.mockResolvedValueOnce(2).mockResolvedValueOnce(3);
    const result = await getPlacementRate();
    expect(result).toBe(67);
  });
});

describe("getPendingVerificationsCount", () => {
  it("counts applications with status NEW or REVIEWING only", async () => {
    mockJobApplicationCount.mockResolvedValue(5);
    const result = await getPendingVerificationsCount();
    expect(result).toBe(5);
    expect(mockJobApplicationCount).toHaveBeenCalledWith({
      where: { status: { in: [ApplicationStatus.NEW, ApplicationStatus.REVIEWING] } },
    });
  });
});

describe("getApplicationStatusDistribution", () => {
  it("zero-fills every ApplicationStatus value even when some have no rows", async () => {
    mockJobApplicationGroupBy.mockResolvedValue([
      { status: ApplicationStatus.NEW, _count: 4 },
    ] as never);

    const result = await getApplicationStatusDistribution();

    for (const status of Object.values(ApplicationStatus)) {
      expect(result).toHaveProperty(status);
    }
    expect(result[ApplicationStatus.NEW]).toBe(4);
    expect(result[ApplicationStatus.REVIEWING]).toBe(0);
    expect(result[ApplicationStatus.SHORTLISTED]).toBe(0);
    expect(result[ApplicationStatus.HIRED]).toBe(0);
    expect(result[ApplicationStatus.REJECTED]).toBe(0);
    expect(result[ApplicationStatus.WITHDRAWN]).toBe(0);
  });

  it("zero-fills all statuses when groupBy returns nothing at all", async () => {
    mockJobApplicationGroupBy.mockResolvedValue([]);
    const result = await getApplicationStatusDistribution();
    for (const status of Object.values(ApplicationStatus)) {
      expect(result[status]).toBe(0);
    }
  });
});

describe("getJobStatusCounts", () => {
  it("zero-fills every JobStatus value even when some have no rows", async () => {
    mockJobGroupBy.mockResolvedValue([{ status: JobStatus.PUBLISHED, _count: 2 }] as never);

    const result = await getJobStatusCounts();

    for (const status of Object.values(JobStatus)) {
      expect(result).toHaveProperty(status);
    }
    expect(result[JobStatus.PUBLISHED]).toBe(2);
    expect(result[JobStatus.DRAFT]).toBe(0);
    expect(result[JobStatus.PAUSED]).toBe(0);
    expect(result[JobStatus.CLOSED]).toBe(0);
    expect(result[JobStatus.ARCHIVED]).toBe(0);
  });
});

describe("getRecentApplications", () => {
  it("fetches the latest applications ordered by createdAt desc, defaulting to 5", async () => {
    mockJobApplicationFindMany.mockResolvedValue([]);
    await getRecentApplications();
    expect(mockJobApplicationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" }, take: 5 })
    );
  });

  it("respects a custom limit", async () => {
    mockJobApplicationFindMany.mockResolvedValue([]);
    await getRecentApplications(10);
    expect(mockJobApplicationFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
  });
});

describe("getAvgTimeToFillDays", () => {
  it("returns null (not 0 or NaN) when no job has both closedAt and publishedAt", async () => {
    mockJobFindMany.mockResolvedValue([]);
    const result = await getAvgTimeToFillDays();
    expect(result).toBeNull();
  });

  it("computes the whole-day average across qualifying jobs", async () => {
    mockJobFindMany.mockResolvedValue([
      { publishedAt: new Date("2026-01-01"), closedAt: new Date("2026-01-11") }, // 10 days
      { publishedAt: new Date("2026-01-01"), closedAt: new Date("2026-01-21") }, // 20 days
    ] as never);

    const result = await getAvgTimeToFillDays();
    expect(result).toBe(15);
  });

  it("only queries jobs with both closedAt and publishedAt set", async () => {
    mockJobFindMany.mockResolvedValue([]);
    await getAvgTimeToFillDays();
    expect(mockJobFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { closedAt: { not: null }, publishedAt: { not: null } },
      })
    );
  });
});

describe("getTotalPlacementsYtd", () => {
  it("counts HIRED applications created since Jan 1 of the current year", async () => {
    mockJobApplicationCount.mockResolvedValue(3);
    const result = await getTotalPlacementsYtd();
    expect(result).toBe(3);
    const callArgs = mockJobApplicationCount.mock.calls[0][0] as {
      where: { status: string; createdAt: { gte: Date } };
    };
    expect(callArgs.where.status).toBe(ApplicationStatus.HIRED);
    expect(callArgs.where.createdAt.gte.getMonth()).toBe(0);
    expect(callArgs.where.createdAt.gte.getDate()).toBe(1);
  });
});

describe("getTotalActiveEmployers", () => {
  it("counts only active clients", async () => {
    mockClientCount.mockResolvedValue(4);
    const result = await getTotalActiveEmployers();
    expect(result).toBe(4);
    expect(mockClientCount).toHaveBeenCalledWith({ where: { isActive: true } });
  });
});

describe("getApplicationsBySector", () => {
  it("zero-fills sectors with no applications", async () => {
    mockSectorFindMany.mockResolvedValue([
      { name: SectorName.PRODUCTION, label: "Production", jobs: [{ _count: { applications: 3 } }] },
      { name: SectorName.WAREHOUSING, label: "Warehousing", jobs: [] },
    ] as never);

    const result = await getApplicationsBySector();

    expect(result).toEqual([
      { sector: SectorName.PRODUCTION, label: "Production", count: 3 },
      { sector: SectorName.WAREHOUSING, label: "Warehousing", count: 0 },
    ]);
  });

  it("sums applications across all of a sector's jobs", async () => {
    mockSectorFindMany.mockResolvedValue([
      {
        name: SectorName.AUTOMOTIVE,
        label: "Automotive",
        jobs: [{ _count: { applications: 2 } }, { _count: { applications: 5 } }],
      },
    ] as never);

    const result = await getApplicationsBySector();
    expect(result[0].count).toBe(7);
  });
});

describe("getTopEmployers", () => {
  it("excludes clients with zero placements", async () => {
    mockClientFindMany.mockResolvedValue([
      { id: "c1", name: "Zero Placements Ltd", jobs: [{ sector: { label: "Warehousing" }, applications: [] }] },
      {
        id: "c2",
        name: "Some Placements Ltd",
        jobs: [{ sector: { label: "Automotive" }, applications: [{ id: "a1" }] }],
      },
    ] as never);

    const result = await getTopEmployers();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c2");
    expect(result[0].placementCount).toBe(1);
  });

  it("sorts by placement count descending and respects the limit", async () => {
    mockClientFindMany.mockResolvedValue([
      { id: "c1", name: "Low", jobs: [{ sector: { label: "A" }, applications: [{ id: "1" }] }] },
      {
        id: "c2",
        name: "High",
        jobs: [{ sector: { label: "B" }, applications: [{ id: "1" }, { id: "2" }, { id: "3" }] }],
      },
    ] as never);

    const result = await getTopEmployers(1);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c2");
    expect(result[0].placementCount).toBe(3);
  });

  it("shows the sector of the client's highest-placement job when spanning multiple sectors", async () => {
    mockClientFindMany.mockResolvedValue([
      {
        id: "c1",
        name: "Multi-Sector Ltd",
        jobs: [
          { sector: { label: "Warehousing" }, applications: [{ id: "1" }] },
          { sector: { label: "Automotive" }, applications: [{ id: "1" }, { id: "2" }] },
        ],
      },
    ] as never);

    const result = await getTopEmployers();
    expect(result[0].sectorLabel).toBe("Automotive");
  });
});

describe("getTopPerformingRoles", () => {
  it("orders by application count descending and defaults to a limit of 5", async () => {
    mockJobFindMany.mockResolvedValue([]);
    await getTopPerformingRoles();
    expect(mockJobFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { applications: { _count: "desc" } }, take: 5 })
    );
  });

  it("returns 'In progress' (null avgDaysToFill) when closedAt is not set", async () => {
    mockJobFindMany.mockResolvedValue([
      {
        id: "job-1",
        title: "Warehouse Operative",
        publishedAt: new Date("2026-01-01"),
        closedAt: null,
        _count: { applications: 9 },
      },
    ] as never);

    const result = await getTopPerformingRoles();
    expect(result[0].avgDaysToFill).toBeNull();
    expect(result[0].applicantCount).toBe(9);
  });

  it("computes avgDaysToFill in whole days when closedAt is set", async () => {
    mockJobFindMany.mockResolvedValue([
      {
        id: "job-1",
        title: "Warehouse Operative",
        publishedAt: new Date("2026-01-01"),
        closedAt: new Date("2026-01-11"),
        _count: { applications: 4 },
      },
    ] as never);

    const result = await getTopPerformingRoles();
    expect(result[0].avgDaysToFill).toBe(10);
  });
});

describe("buildCandidateWhere", () => {
  it("returns an empty where clause when no filters are supplied", () => {
    expect(buildCandidateWhere({})).toEqual({});
  });

  it("builds a case-insensitive name/email OR search clause", () => {
    const where = buildCandidateWhere({ search: "jane" });
    expect(where).toEqual({
      AND: [
        {
          OR: [
            { fullName: { contains: "jane", mode: "insensitive" } },
            { email: { contains: "jane", mode: "insensitive" } },
          ],
        },
      ],
    });
  });

  it("filters by job.sectorId", () => {
    const where = buildCandidateWhere({ sectorId: "sector-1" });
    expect(where).toEqual({ AND: [{ job: { sectorId: "sector-1" } }] });
  });

  it("filters by derived verification group using VERIFICATION_STATUS_GROUPS", () => {
    const where = buildCandidateWhere({ verification: "verified" });
    expect(where).toEqual({
      AND: [{ status: { in: VERIFICATION_STATUS_GROUPS.verified } }],
    });
  });

  it("combines search, sectorId, and verification filters with AND", () => {
    const where = buildCandidateWhere({ search: "jane", sectorId: "sector-1", verification: "pending" });
    expect(where).toEqual({
      AND: [
        {
          OR: [
            { fullName: { contains: "jane", mode: "insensitive" } },
            { email: { contains: "jane", mode: "insensitive" } },
          ],
        },
        { job: { sectorId: "sector-1" } },
        { status: { in: VERIFICATION_STATUS_GROUPS.pending } },
      ],
    });
  });
});
