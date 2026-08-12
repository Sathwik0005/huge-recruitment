import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/lib/job-dto", () => ({
  getJobBySlugForDetailPage: vi.fn(),
  getSimilarJobs: vi.fn().mockResolvedValue([]),
}));

vi.mock("./GuestApplicationForm", () => ({
  GuestApplicationForm: () => <div data-testid="application-form" />,
}));

vi.mock("./SimilarJobs", () => ({
  SimilarJobs: () => <div data-testid="similar-jobs" />,
}));

import { notFound } from "next/navigation";
import { getJobBySlugForDetailPage } from "@/lib/job-dto";
import JobDetailPage, { generateMetadata } from "./page";

const mockGetJob = vi.mocked(getJobBySlugForDetailPage);
const mockNotFound = vi.mocked(notFound);

const BASE_JOB = {
  id: "job-1",
  slug: "warehouse-operative",
  title: "Warehouse Operative",
  overview: "Great role overview.",
  shortDescription: null,
  employmentType: "PERMANENT",
  townOrCity: "Foston",
  countyOrRegion: null,
  postcode: null,
  payType: "COMPETITIVE",
  currency: "GBP",
  additionalPayInformation: null,
  referenceCode: null,
  startDate: null,
  closingDate: null,
  vacancyCount: null,
  hoursPerWeek: null,
  shiftSummary: null,
  additionalInformation: null,
  showPostedDate: true,
  featured: false,
  publishedAt: new Date("2026-01-01"),
  status: "PUBLISHED",
  sector: { id: "s1", name: "WAREHOUSING", label: "Warehousing" },
  payRates: [],
  shifts: [],
  responsibilities: [],
  requirements: [],
  benefits: [],
  isOpen: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/jobs/[slug] page", () => {
  it("calls notFound() for an unknown slug", async () => {
    mockGetJob.mockResolvedValue(null);

    await expect(
      JobDetailPage({ params: Promise.resolve({ slug: "unknown-slug" }) })
    ).rejects.toThrow("NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("renders the job title as the only h1", async () => {
    mockGetJob.mockResolvedValue(BASE_JOB as never);

    const jsx = await JobDetailPage({ params: Promise.resolve({ slug: "warehouse-operative" }) });
    render(jsx);

    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Warehouse Operative");
  });

  it("omits empty optional sections", async () => {
    mockGetJob.mockResolvedValue(BASE_JOB as never);

    const jsx = await JobDetailPage({ params: Promise.resolve({ slug: "warehouse-operative" }) });
    render(jsx);

    expect(screen.queryByText("What you’ll be doing")).not.toBeInTheDocument();
    expect(screen.queryByText("Shift pattern")).not.toBeInTheDocument();
    expect(screen.queryByText("Pay details")).not.toBeInTheDocument();
    expect(screen.queryByText("What’s included")).not.toBeInTheDocument();
  });

  it("renders present optional sections", async () => {
    mockGetJob.mockResolvedValue({
      ...BASE_JOB,
      responsibilities: [{ text: "Pick and pack orders." }],
    } as never);

    const jsx = await JobDetailPage({ params: Promise.resolve({ slug: "warehouse-operative" }) });
    render(jsx);

    expect(screen.getByText("What you’ll be doing")).toBeInTheDocument();
    expect(screen.getByText("Pick and pack orders.")).toBeInTheDocument();
  });
});

describe("generateMetadata", () => {
  it("returns a generic title for an unknown slug", async () => {
    mockGetJob.mockResolvedValue(null);
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "unknown" }) });
    expect(metadata.title).toBe("Job not found");
  });

  it("returns the job title and a description for a real job", async () => {
    mockGetJob.mockResolvedValue(BASE_JOB as never);
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "warehouse-operative" }) });
    expect(metadata.title).toContain("Warehouse Operative");
    expect(metadata.description).toBeTruthy();
  });
});
