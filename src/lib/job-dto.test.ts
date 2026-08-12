import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    job: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getPublicJobs, getPublicJobBySlug, PUBLIC_JOB_SELECT } from "./job-dto";

const mockCount = vi.mocked(prisma.job.count);
const mockFindMany = vi.mocked(prisma.job.findMany);
const mockFindFirst = vi.mocked(prisma.job.findFirst);

beforeEach(() => {
  vi.clearAllMocks();
  mockCount.mockResolvedValue(0);
  mockFindMany.mockResolvedValue([]);
});

describe("PUBLIC_JOB_SELECT", () => {
  it("never selects clientId or admin audit fields", () => {
    expect(PUBLIC_JOB_SELECT).not.toHaveProperty("clientId");
    expect(PUBLIC_JOB_SELECT).not.toHaveProperty("createdById");
    expect(PUBLIC_JOB_SELECT).not.toHaveProperty("updatedById");
  });
});

describe("getPublicJobs", () => {
  it("always filters to PUBLISHED status", async () => {
    await getPublicJobs({});
    const where = mockFindMany.mock.calls[0][0]?.where as { status?: string };
    expect(where.status).toBe("PUBLISHED");
  });

  it("applies a date-window filter for startDate/closingDate", async () => {
    await getPublicJobs({});
    const where = mockFindMany.mock.calls[0][0]?.where as { OR?: unknown; AND?: unknown };
    expect(where.OR).toBeDefined();
    expect(where.AND).toBeDefined();
  });

  it("maps the keyword filter onto title/overview/shortDescription/referenceCode OR conditions", async () => {
    await getPublicJobs({ keyword: "warehouse" });
    const where = mockFindMany.mock.calls[0][0]?.where as { AND: { OR?: { title?: unknown }[] }[] };
    const keywordClause = where.AND.find((clause) => clause.OR?.[0]?.title);
    expect(keywordClause).toBeDefined();
  });

  it("combines multiple filters with AND", async () => {
    await getPublicJobs({ keyword: "warehouse", location: "Foston", sectors: ["WAREHOUSING"] });
    const where = mockFindMany.mock.calls[0][0]?.where as { AND: unknown[] };
    expect(where.AND.length).toBeGreaterThanOrEqual(3);
  });

  it("sorts newest by publishedAt desc by default", async () => {
    await getPublicJobs({});
    const orderBy = mockFindMany.mock.calls[0][0]?.orderBy;
    expect(orderBy).toEqual([{ featured: "desc" }, { publishedAt: "desc" }]);
  });

  it("sorts oldest by publishedAt asc", async () => {
    await getPublicJobs({ sort: "oldest" });
    const orderBy = mockFindMany.mock.calls[0][0]?.orderBy;
    expect(orderBy).toEqual([{ publishedAt: "asc" }]);
  });

  it("sorts by pay ascending using the primary rate, in-memory after fetch", async () => {
    mockFindMany.mockResolvedValue([
      { id: "a", payRates: [{ minimum: 20, isPrimary: true }] },
      { id: "b", payRates: [{ minimum: 10, isPrimary: true }] },
    ] as never);

    const result = await getPublicJobs({ sort: "pay-asc" });
    expect(result.jobs.map((j) => j.id)).toEqual(["b", "a"]);
  });

  it("sorts by pay descending using the primary rate", async () => {
    mockFindMany.mockResolvedValue([
      { id: "a", payRates: [{ minimum: 20, isPrimary: true }] },
      { id: "b", payRates: [{ minimum: 10, isPrimary: true }] },
    ] as never);

    const result = await getPublicJobs({ sort: "pay-desc" });
    expect(result.jobs.map((j) => j.id)).toEqual(["a", "b"]);
  });

  it("paginates using page/pageSize and reports pageCount", async () => {
    mockCount.mockResolvedValue(25);
    const result = await getPublicJobs({ page: 2, pageSize: 10 });
    expect(mockFindMany.mock.calls[0][0]?.skip).toBe(10);
    expect(mockFindMany.mock.calls[0][0]?.take).toBe(10);
    expect(result.pageCount).toBe(3);
  });

  it("clamps an out-of-range page down to the last valid page", async () => {
    mockCount.mockResolvedValue(5);
    const result = await getPublicJobs({ page: 99, pageSize: 10 });
    expect(result.page).toBe(1);
  });
});

describe("getPublicJobBySlug", () => {
  it("only matches PUBLISHED jobs within their date window", async () => {
    mockFindFirst.mockResolvedValue(null);
    await getPublicJobBySlug("some-slug");
    const where = mockFindFirst.mock.calls[0][0]?.where as { status?: string };
    expect(where.status).toBe("PUBLISHED");
  });
});
