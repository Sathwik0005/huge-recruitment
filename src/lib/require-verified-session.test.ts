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
import { requireVerifiedSession } from "@/lib/require-verified-session";

const mockGetSession = vi.mocked(getSession);
const mockFindUnique = vi.mocked(prisma.user.findUnique);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireVerifiedSession", () => {
  it("returns unauthenticated when there is no session cookie / session is null", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await requireVerifiedSession();

    expect(result).toEqual({ status: "unauthenticated" });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns unverified when the session's email_verified claim is false, without querying the DB", async () => {
    mockGetSession.mockResolvedValue({ uid: "uid-1", email_verified: false } as never);

    const result = await requireVerifiedSession();

    expect(result).toEqual({ status: "unverified" });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns no-db-user when the session is verified but no Prisma User row exists for the uid", async () => {
    mockGetSession.mockResolvedValue({ uid: "uid-1", email_verified: true } as never);
    mockFindUnique.mockResolvedValue(null);

    const result = await requireVerifiedSession();

    expect(result).toEqual({ status: "no-db-user" });
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { firebaseUid: "uid-1" } });
  });

  it("returns ok with the User row when the session is verified and a matching User exists", async () => {
    const user = { id: "u1", firebaseUid: "uid-1", firstName: "A", lastName: "B", email: "a@b.com" };
    mockGetSession.mockResolvedValue({ uid: "uid-1", email_verified: true } as never);
    mockFindUnique.mockResolvedValue(user as never);

    const result = await requireVerifiedSession();

    expect(result).toEqual({ status: "ok", user });
  });

  it("scopes the DB lookup strictly by the verified session's uid, not any client-supplied id", async () => {
    mockGetSession.mockResolvedValue({ uid: "the-verified-uid", email_verified: true } as never);
    mockFindUnique.mockResolvedValue(null);

    await requireVerifiedSession();

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { firebaseUid: "the-verified-uid" } });
  });
});
