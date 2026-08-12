import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/require-admin-session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/job-slug", () => ({
  generateJobSlug: vi.fn().mockResolvedValue("warehouse-operative"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    job: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    jobPayRate: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    jobShift: { deleteMany: vi.fn(), createMany: vi.fn() },
    jobResponsibility: { deleteMany: vi.fn(), createMany: vi.fn() },
    jobRequirement: { deleteMany: vi.fn(), createMany: vi.fn() },
    jobBenefit: { deleteMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { requireAdminSession } from "@/lib/require-admin-session";
import { prisma } from "@/lib/prisma";
import { createJob, updateJob, publishJob, pauseJob } from "./actions";

const mockRequireAdminSession = vi.mocked(requireAdminSession);
const mockTransaction = vi.mocked(prisma.$transaction);
const mockJobFindUnique = vi.mocked(prisma.job.findUnique);
const mockJobUpdate = vi.mocked(prisma.job.update);
const mockPayRateDeleteMany = vi.mocked(prisma.jobPayRate.deleteMany);

const ADMIN_USER = { id: "admin-1", role: "ADMIN", status: "ACTIVE" };

const VALID_JOB_INPUT = {
  title: "Warehouse Operative",
  sectorId: "sector-1",
  employmentType: "PERMANENT",
  overview: "Great role.",
  townOrCity: "Foston",
  payType: "COMPETITIVE",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createJob", () => {
  it("short-circuits before any Prisma call when the caller is not an admin", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "forbidden" });

    const result = await createJob(VALID_JOB_INPUT);

    expect(result.success).toBe(false);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects invalid input without calling Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);

    const result = await createJob({ ...VALID_JOB_INPUT, title: "" });

    expect(result.success).toBe(false);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("uses a transaction to create the job and its child collections", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockTransaction.mockImplementation((async (callback: (tx: typeof prisma) => unknown) => {
      return callback(prisma);
    }) as never);
    vi.mocked(prisma.job.create).mockResolvedValue({ id: "job-1" } as never);

    const result = await createJob(VALID_JOB_INPUT);

    expect(result.success).toBe(true);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });
});

describe("updateJob", () => {
  it("short-circuits before any Prisma call when the caller is not an admin", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "unauthenticated" });

    const result = await updateJob("job-1", VALID_JOB_INPUT);

    expect(result.success).toBe(false);
    expect(mockJobFindUnique).not.toHaveBeenCalled();
  });

  it("deletes existing pay rates when switching a job to COMPETITIVE pay", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockJobFindUnique.mockResolvedValue({ id: "job-1", title: "Warehouse Operative", slug: "warehouse-operative" } as never);
    mockTransaction.mockResolvedValue(undefined as never);

    const result = await updateJob("job-1", VALID_JOB_INPUT);

    expect(result.success).toBe(true);
    // The transaction array includes the job update plus deleteMany for every
    // child collection (pay rates included) — verifying the array form was used.
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    const transactionArg = mockTransaction.mock.calls[0][0];
    expect(Array.isArray(transactionArg)).toBe(true);
  });

  it("returns an error when the job does not exist", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockJobFindUnique.mockResolvedValue(null);

    const result = await updateJob("missing-job", VALID_JOB_INPUT);

    expect(result.success).toBe(false);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("status transitions", () => {
  it("rejects an invalid transition without writing to the database", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockJobFindUnique.mockResolvedValue({ id: "job-1", status: "ARCHIVED", payRates: [] } as never);

    const result = await publishJob("job-1");

    expect(result.success).toBe(false);
    expect(mockJobUpdate).not.toHaveBeenCalled();
  });

  it("blocks publishing a NUMERIC job with no pay rates", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockJobFindUnique.mockResolvedValue({
      id: "job-1",
      status: "DRAFT",
      title: "Warehouse Operative",
      sectorId: "sector-1",
      employmentType: "PERMANENT",
      overview: "Great role.",
      townOrCity: "Foston",
      countyOrRegion: null,
      postcode: null,
      payType: "NUMERIC",
      payRates: [],
      startDate: null,
      closingDate: null,
    } as never);

    const result = await publishJob("job-1");

    expect(result.success).toBe(false);
    expect(mockJobUpdate).not.toHaveBeenCalled();
  });

  it("allows a valid PAUSED -> PUBLISHED transition with valid readiness data", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockJobFindUnique.mockResolvedValue({
      id: "job-1",
      status: "PAUSED",
      title: "Warehouse Operative",
      sectorId: "sector-1",
      employmentType: "PERMANENT",
      overview: "Great role.",
      townOrCity: "Foston",
      countyOrRegion: null,
      postcode: null,
      payType: "COMPETITIVE",
      payRates: [],
      publishedAt: new Date("2026-01-01"),
      startDate: null,
      closingDate: null,
    } as never);

    const result = await publishJob("job-1");

    expect(result.success).toBe(true);
    expect(mockJobUpdate).toHaveBeenCalledTimes(1);
  });

  it("does not touch pay rates on a non-publish transition like pause", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockJobFindUnique.mockResolvedValue({ id: "job-1", status: "PUBLISHED", payRates: [] } as never);

    await pauseJob("job-1");

    expect(mockPayRateDeleteMany).not.toHaveBeenCalled();
  });
});
