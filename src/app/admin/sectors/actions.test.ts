import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/require-admin-session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sector: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    job: {
      count: vi.fn(),
    },
  },
}));

import { requireAdminSession } from "@/lib/require-admin-session";
import { prisma } from "@/lib/prisma";
import { toggleSectorActive, forceDeactivateSector } from "./actions";

const mockRequireAdminSession = vi.mocked(requireAdminSession);
const mockSectorFindUnique = vi.mocked(prisma.sector.findUnique);
const mockSectorUpdate = vi.mocked(prisma.sector.update);
const mockJobCount = vi.mocked(prisma.job.count);

const ADMIN_USER = { id: "admin-1", role: "ADMIN", status: "ACTIVE" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("toggleSectorActive", () => {
  it("short-circuits when the caller is not an admin", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "unauthenticated" });

    const result = await toggleSectorActive("sector-1", false);

    expect(result.success).toBe(false);
    expect(mockSectorFindUnique).not.toHaveBeenCalled();
  });

  it("activates a sector without checking job count", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockSectorFindUnique.mockResolvedValue({ id: "sector-1", isActive: false } as never);

    const result = await toggleSectorActive("sector-1", true);

    expect(result).toEqual({ success: true, isActive: true });
    expect(mockJobCount).not.toHaveBeenCalled();
    expect(mockSectorUpdate).toHaveBeenCalledWith({
      where: { id: "sector-1" },
      data: { isActive: true },
    });
  });

  it("deactivates immediately when no jobs reference the sector", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockSectorFindUnique.mockResolvedValue({ id: "sector-1", isActive: true } as never);
    mockJobCount.mockResolvedValue(0);

    const result = await toggleSectorActive("sector-1", false);

    expect(result).toEqual({ success: true, isActive: false });
    expect(mockSectorUpdate).toHaveBeenCalledTimes(1);
  });

  it("returns a warning (not a hard block, never deletes) when jobs still reference the sector", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockSectorFindUnique.mockResolvedValue({ id: "sector-1", isActive: true } as never);
    mockJobCount.mockResolvedValue(3);

    const result = await toggleSectorActive("sector-1", false);

    expect(result.success).toBe(false);
    expect(result).toMatchObject({ activeJobCount: 3 });
    expect(mockSectorUpdate).not.toHaveBeenCalled();
  });

  it("excludes ARCHIVED jobs from the active-job count", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockSectorFindUnique.mockResolvedValue({ id: "sector-1", isActive: true } as never);
    mockJobCount.mockResolvedValue(0);

    await toggleSectorActive("sector-1", false);

    expect(mockJobCount).toHaveBeenCalledWith({
      where: { sectorId: "sector-1", status: { not: "ARCHIVED" } },
    });
  });
});

describe("forceDeactivateSector", () => {
  it("deactivates unconditionally, bypassing the job-count check", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockSectorFindUnique.mockResolvedValue({ id: "sector-1", isActive: true } as never);

    const result = await forceDeactivateSector("sector-1");

    expect(result).toEqual({ success: true, isActive: false });
    expect(mockJobCount).not.toHaveBeenCalled();
  });
});
