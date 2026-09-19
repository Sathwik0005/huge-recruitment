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
import { requireVerifiedSession } from "./require-verified-session";

const mockGetSession = vi.mocked(getSession);
const mockFindUnique = vi.mocked(prisma.user.findUnique);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireVerifiedSession", () => {
  it("returns unauthenticated when there is no session", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(requireVerifiedSession()).resolves.toEqual({ status: "unauthenticated" });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns unverified when the session email is not verified", async () => {
    mockGetSession.mockResolvedValue({ uid: "uid-1", email_verified: false } as never);

    await expect(requireVerifiedSession()).resolves.toEqual({ status: "unverified" });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns no-db-user when no matching User row exists", async () => {
    mockGetSession.mockResolvedValue({ uid: "uid-1", email_verified: true } as never);
    mockFindUnique.mockResolvedValue(null);

    await expect(requireVerifiedSession()).resolves.toEqual({ status: "no-db-user" });
  });

  it("returns ok with the user when the session is verified and a User row exists", async () => {
    const user = {
      id: "1",
      firebaseUid: "uid-1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      role: "USER",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockGetSession.mockResolvedValue({ uid: "uid-1", email_verified: true } as never);
    mockFindUnique.mockResolvedValue(user as never);

    await expect(requireVerifiedSession()).resolves.toEqual({ status: "ok", user });
  });
});
