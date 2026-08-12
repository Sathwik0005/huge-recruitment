import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/job-dto", () => ({
  getPublicJobs: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sector: { findMany: vi.fn() },
  },
}));

vi.mock("./JobFilters", () => ({
  JobFilters: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { getPublicJobs } from "@/lib/job-dto";
import { prisma } from "@/lib/prisma";
import JobsPage from "./page";

const mockGetPublicJobs = vi.mocked(getPublicJobs);
const mockSectorFindMany = vi.mocked(prisma.sector.findMany);

const SAMPLE_JOB = {
  id: "job-1",
  slug: "warehouse-operative",
  title: "Warehouse Operative",
  overview: "Great role.",
  shortDescription: null,
  employmentType: "PERMANENT",
  townOrCity: "Foston",
  countyOrRegion: null,
  postcode: null,
  payType: "COMPETITIVE",
  payRates: [],
  shifts: [],
  responsibilities: [],
  requirements: [],
  benefits: [],
  sector: { id: "s1", name: "WAREHOUSING", label: "Warehousing" },
  showPostedDate: true,
  publishedAt: new Date("2026-01-01"),
  featured: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSectorFindMany.mockResolvedValue([]);
});

describe("/jobs page", () => {
  it("renders job cards when jobs are returned", async () => {
    mockGetPublicJobs.mockResolvedValue({ jobs: [SAMPLE_JOB], total: 1, page: 1, pageCount: 1, pageSize: 10 } as never);

    const jsx = await JobsPage({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByText("Warehouse Operative")).toBeInTheDocument();
  });

  it("renders the empty state when no jobs match", async () => {
    mockGetPublicJobs.mockResolvedValue({ jobs: [], total: 0, page: 1, pageCount: 1, pageSize: 10 } as never);

    const jsx = await JobsPage({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByText("No jobs are currently listed")).toBeInTheDocument();
  });

  it("shows the filtered empty state (with reset) when filters produced zero results", async () => {
    mockGetPublicJobs.mockResolvedValue({ jobs: [], total: 0, page: 1, pageCount: 1, pageSize: 10 } as never);

    const jsx = await JobsPage({ searchParams: Promise.resolve({ keyword: "zzz" }) });
    render(jsx);

    expect(screen.getByText("No matching jobs found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reset filters" })).toBeInTheDocument();
  });

  it("clamps an out-of-range page param without crashing", async () => {
    mockGetPublicJobs.mockResolvedValue({ jobs: [SAMPLE_JOB], total: 1, page: 1, pageCount: 1, pageSize: 10 } as never);

    const jsx = await JobsPage({ searchParams: Promise.resolve({ page: "9999" }) });
    render(jsx);

    expect(mockGetPublicJobs).toHaveBeenCalledWith(expect.objectContaining({ page: 9999 }));
    expect(screen.getByText("Warehouse Operative")).toBeInTheDocument();
  });
});
