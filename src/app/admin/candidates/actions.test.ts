import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/require-admin-session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobApplication: {
      update: vi.fn(),
    },
  },
}));

import { requireAdminSession } from "@/lib/require-admin-session";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@/generated/prisma/enums";
import { updateApplicationStatus } from "./actions";

const mockRequireAdminSession = vi.mocked(requireAdminSession);
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockJobApplicationUpdate = vi.mocked(prisma.jobApplication.update);

const ADMIN_USER = { id: "admin-1", role: "ADMIN", status: "ACTIVE" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateApplicationStatus", () => {
  it("short-circuits when the caller is unauthenticated, without touching Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "unauthenticated" });

    const result = await updateApplicationStatus("app-1", ApplicationStatus.SHORTLISTED);

    expect(result.success).toBe(false);
    expect(mockJobApplicationUpdate).not.toHaveBeenCalled();
  });

  it("short-circuits when the caller is a non-admin (forbidden), without touching Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "forbidden" });

    const result = await updateApplicationStatus("app-1", ApplicationStatus.SHORTLISTED);

    expect(result.success).toBe(false);
    expect(mockJobApplicationUpdate).not.toHaveBeenCalled();
  });

  it("short-circuits when the caller has an unverified session, without touching Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "unverified" });

    const result = await updateApplicationStatus("app-1", ApplicationStatus.SHORTLISTED);

    expect(result.success).toBe(false);
    expect(mockJobApplicationUpdate).not.toHaveBeenCalled();
  });

  it("rejects an invalid status value without calling Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);

    const result = await updateApplicationStatus("app-1", "NOT_A_REAL_STATUS" as ApplicationStatus);

    expect(result.success).toBe(false);
    expect(mockJobApplicationUpdate).not.toHaveBeenCalled();
  });

  it.each(Object.values(ApplicationStatus))(
    "updates the application status to %s on the happy path",
    async (status) => {
      mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
      mockJobApplicationUpdate.mockResolvedValue({ id: "app-1", status } as never);

      const result = await updateApplicationStatus("app-1", status);

      expect(result).toEqual({ success: true });
      expect(mockJobApplicationUpdate).toHaveBeenCalledWith({
        where: { id: "app-1" },
        data: { status },
      });
    }
  );

  it("revalidates both the candidates list and the candidate detail page", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockJobApplicationUpdate.mockResolvedValue({ id: "app-1", status: ApplicationStatus.HIRED } as never);

    await updateApplicationStatus("app-1", ApplicationStatus.HIRED);

    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/candidates");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/candidates/app-1");
  });

  it("returns a generic error and does not leak the raw exception when Prisma throws", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockJobApplicationUpdate.mockRejectedValue(new Error("connection reset"));

    const result = await updateApplicationStatus("app-1", ApplicationStatus.HIRED);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).not.toContain("connection reset");
    }
  });
});
