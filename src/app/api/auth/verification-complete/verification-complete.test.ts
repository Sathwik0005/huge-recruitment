import { describe, it, expect, vi, beforeEach } from "vitest";

const afterTasks = vi.hoisted(() => [] as Promise<void>[]);

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: vi.fn((callback: () => void | Promise<void>) => {
      afterTasks.push(Promise.resolve().then(callback).then(() => undefined));
    }),
  };
});

vi.mock("@/firebase/admin", () => ({
  getUserByEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/welcome-email", () => ({
  sendWelcomeEmailOnce: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIdentifier: vi.fn().mockReturnValue("1.2.3.4"),
}));

import { getUserByEmail } from "@/firebase/admin";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmailOnce } from "@/lib/welcome-email";
import { checkRateLimit } from "@/lib/rate-limit";
import { after } from "next/server";
import { POST } from "./route";

const mockGetUserByEmail = vi.mocked(getUserByEmail);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockSendWelcomeEmailOnce = vi.mocked(sendWelcomeEmailOnce);
const mockCheckRateLimit = vi.mocked(checkRateLimit);
const mockAfter = vi.mocked(after);

async function flushAfterTasks() {
  await Promise.all(afterTasks.splice(0));
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/verification-complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  afterTasks.length = 0;
  mockCheckRateLimit.mockResolvedValue(true);
  mockSendWelcomeEmailOnce.mockResolvedValue(undefined);
});

describe("POST /api/auth/verification-complete", () => {
  it("returns 400 for a missing/empty email", async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it("anti-enumeration: nonexistent Firebase user, unverified user, and a verified-and-welcomed user all get the identical generic response", async () => {
    mockGetUserByEmail.mockRejectedValueOnce({ code: "auth/user-not-found" });
    const notFoundResponse = await POST(makeRequest({ email: "nobody@example.com" }));
    const notFoundJson = await notFoundResponse.json();
    await flushAfterTasks();

    mockGetUserByEmail.mockResolvedValueOnce({ emailVerified: false } as never);
    const unverifiedResponse = await POST(makeRequest({ email: "unverified@example.com" }));
    const unverifiedJson = await unverifiedResponse.json();
    await flushAfterTasks();

    mockGetUserByEmail.mockResolvedValueOnce({ emailVerified: true } as never);
    mockFindUnique.mockResolvedValueOnce({ id: "1", email: "verified@example.com", firstName: "Ann" } as never);
    const verifiedResponse = await POST(makeRequest({ email: "verified@example.com" }));
    const verifiedJson = await verifiedResponse.json();
    await flushAfterTasks();

    expect(notFoundResponse.status).toBe(unverifiedResponse.status);
    expect(notFoundResponse.status).toBe(verifiedResponse.status);
    expect(notFoundJson).toEqual(unverifiedJson);
    expect(notFoundJson).toEqual(verifiedJson);
  });

  it("does not call sendWelcomeEmailOnce for an unverified Firebase user", async () => {
    mockGetUserByEmail.mockResolvedValue({ emailVerified: false } as never);

    await POST(makeRequest({ email: "unverified@example.com" }));
    await flushAfterTasks();

    expect(mockSendWelcomeEmailOnce).not.toHaveBeenCalled();
  });

  it("re-derives verification truth from Firebase (getUserByEmail), never trusting the client-supplied email as proof of anything beyond a lookup key", async () => {
    mockGetUserByEmail.mockResolvedValue({ emailVerified: true } as never);
    const user = { id: "1", email: "verified@example.com", firstName: "Ann" };
    mockFindUnique.mockResolvedValue(user as never);

    await POST(makeRequest({ email: "verified@example.com" }));
    await flushAfterTasks();

    expect(mockGetUserByEmail).toHaveBeenCalledWith("verified@example.com");
    expect(mockAfter).toHaveBeenCalledTimes(1);
    expect(mockSendWelcomeEmailOnce).toHaveBeenCalledWith(user);
  });

  it("does not crash and still returns the generic response when the Firebase user is verified but no Prisma User exists yet", async () => {
    mockGetUserByEmail.mockResolvedValue({ emailVerified: true } as never);
    mockFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest({ email: "verified@example.com" }));
    await flushAfterTasks();

    expect(response.status).toBe(200);
    expect(mockSendWelcomeEmailOnce).not.toHaveBeenCalled();
  });

  it("rate-limits by client IP since the caller is unauthenticated", async () => {
    mockGetUserByEmail.mockResolvedValue({ emailVerified: false } as never);
    await POST(makeRequest({ email: "a@b.com" }));
    await flushAfterTasks();
    expect(mockCheckRateLimit).toHaveBeenCalledWith("verificationComplete", "1.2.3.4");
  });

  it("still returns the generic 200 when rate-limited, without calling getUserByEmail", async () => {
    mockCheckRateLimit.mockResolvedValue(false);

    const response = await POST(makeRequest({ email: "a@b.com" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(mockGetUserByEmail).not.toHaveBeenCalled();
    expect(mockAfter).not.toHaveBeenCalled();
  });

  it("normalizes the email used for the independently verified Firebase and database lookups", async () => {
    mockGetUserByEmail.mockResolvedValue({ emailVerified: true } as never);
    mockFindUnique.mockResolvedValue(null);

    await POST(makeRequest({ email: "  Verified@Example.COM  " }));
    await flushAfterTasks();

    expect(mockGetUserByEmail).toHaveBeenCalledWith("verified@example.com");
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { email: "verified@example.com" } });
  });
});