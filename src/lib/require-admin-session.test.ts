import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "./require-admin-session";

const mockGetSession = vi.mocked(getSession);
const mockFindUnique = vi.mocked(prisma.user.findUnique);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireAdminSession", () => {
  it("returns unauthenticated when there is no session", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(requireAdminSession()).resolves.toEqual({ status: "unauthenticated" });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns unverified when the session email is not verified", async () => {
    mockGetSession.mockResolvedValue({ uid: "uid-1", email_verified: false } as never);

    await expect(requireAdminSession()).resolves.toEqual({ status: "unverified" });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns no-db-user when no matching User row exists", async () => {
    mockGetSession.mockResolvedValue({ uid: "uid-1", email_verified: true } as never);
    mockFindUnique.mockResolvedValue(null);

    await expect(requireAdminSession()).resolves.toEqual({ status: "no-db-user" });
  });

  it("returns forbidden when the user is not an ADMIN", async () => {
    mockGetSession.mockResolvedValue({ uid: "uid-1", email_verified: true } as never);
    mockFindUnique.mockResolvedValue({
      id: "1",
      firebaseUid: "uid-1",
      role: "USER",
      status: "ACTIVE",
    } as never);

    await expect(requireAdminSession()).resolves.toEqual({ status: "forbidden" });
  });

  it("returns forbidden when the admin user is not ACTIVE", async () => {
    mockGetSession.mockResolvedValue({ uid: "uid-1", email_verified: true } as never);
    mockFindUnique.mockResolvedValue({
      id: "1",
      firebaseUid: "uid-1",
      role: "ADMIN",
      status: "INACTIVE",
    } as never);

    await expect(requireAdminSession()).resolves.toEqual({ status: "forbidden" });
  });

  it("returns ok with the user when the session is a verified, active admin", async () => {
    const user = {
      id: "1",
      firebaseUid: "uid-1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      role: "ADMIN",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockGetSession.mockResolvedValue({ uid: "uid-1", email_verified: true } as never);
    mockFindUnique.mockResolvedValue(user as never);

    await expect(requireAdminSession()).resolves.toEqual({ status: "ok", user });
  });
});
