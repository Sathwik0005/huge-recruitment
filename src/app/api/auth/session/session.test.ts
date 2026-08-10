import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/firebase/admin", () => ({
  verifyIdToken: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/mint-session", () => ({
  mintSession: vi.fn(),
}));

import { verifyIdToken } from "@/firebase/admin";
import { prisma } from "@/lib/prisma";
import { mintSession } from "@/lib/mint-session";
import { POST } from "./route";

const mockVerifyIdToken = vi.mocked(verifyIdToken);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockMintSession = vi.mocked(mintSession);

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMintSession.mockResolvedValue(undefined);
});

describe("POST /api/auth/session", () => {
  it("returns 400 when idToken is missing", async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/session", { method: "POST", body: "{bad" }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 401 when the idToken fails verification", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("bad token"));

    const response = await POST(makeRequest({ idToken: "bad" }));

    expect(response.status).toBe(401);
    expect(mockMintSession).not.toHaveBeenCalled();
  });

  it("returns 403 when the freshly verified token reports email_verified: false — never trusts the client's say-so", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "uid-1", email_verified: false } as never);

    const response = await POST(makeRequest({ idToken: "stale-token" }));
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toBeTruthy();
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockMintSession).not.toHaveBeenCalled();
  });

  it("returns 404 when the token is verified but no matching Prisma User exists", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "uid-1", email_verified: true } as never);
    mockFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest({ idToken: "token" }));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBeTruthy();
    expect(mockMintSession).not.toHaveBeenCalled();
  });

  it("re-mints the session cookie and returns 200 with the user when verified and a matching User exists", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "uid-1", email_verified: true } as never);
    const user = { id: "1", firebaseUid: "uid-1", firstName: "Ann", lastName: "Lee", email: "a@b.com" };
    mockFindUnique.mockResolvedValue(user as never);

    const response = await POST(makeRequest({ idToken: "fresh-token" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ user });
    expect(mockMintSession).toHaveBeenCalledWith("fresh-token");
  });

  it("scopes the User lookup by the verified token's uid, not any client-supplied identifier", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "server-verified-uid", email_verified: true } as never);
    mockFindUnique.mockResolvedValue({ id: "1" } as never);

    await POST(makeRequest({ idToken: "token", firebaseUid: "client-supplied-uid" }));

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { firebaseUid: "server-verified-uid" } });
  });
});
