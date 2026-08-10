import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/firebase/admin", () => ({
  createSessionCookie: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  setSessionCookie: vi.fn(),
  SESSION_MAX_AGE: 60 * 60 * 24 * 5,
}));

import { createSessionCookie } from "@/firebase/admin";
import { setSessionCookie, SESSION_MAX_AGE } from "@/lib/session";
import { mintSession } from "@/lib/mint-session";

const mockCreateSessionCookie = vi.mocked(createSessionCookie);
const mockSetSessionCookie = vi.mocked(setSessionCookie);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("mintSession", () => {
  it("creates a Firebase session cookie with a 5-day maxAge expressed in milliseconds", async () => {
    mockCreateSessionCookie.mockResolvedValue("cookie-value" as never);

    await mintSession("some-id-token");

    expect(mockCreateSessionCookie).toHaveBeenCalledWith("some-id-token", SESSION_MAX_AGE * 1000);
  });

  it("sets the minted cookie via setSessionCookie", async () => {
    mockCreateSessionCookie.mockResolvedValue("cookie-value" as never);

    await mintSession("some-id-token");

    expect(mockSetSessionCookie).toHaveBeenCalledWith("cookie-value");
  });

  it("propagates errors from createSessionCookie without setting a cookie", async () => {
    mockCreateSessionCookie.mockRejectedValue(new Error("firebase down"));

    await expect(mintSession("bad-token")).rejects.toThrow("firebase down");
    expect(mockSetSessionCookie).not.toHaveBeenCalled();
  });
});
