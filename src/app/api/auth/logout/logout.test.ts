import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  clearSessionCookie: vi.fn(),
}));

import { clearSessionCookie } from "@/lib/session";
import { POST } from "./route";

const mockClearSessionCookie = vi.mocked(clearSessionCookie);

beforeEach(() => {
  vi.clearAllMocks();
  mockClearSessionCookie.mockResolvedValue(undefined);
});

describe("POST /api/auth/logout", () => {
  it("clears the session cookie and returns 200", async () => {
    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ success: true });
    expect(mockClearSessionCookie).toHaveBeenCalledTimes(1);
  });

  it("clears the session cookie even though no request body/auth is required", async () => {
    await POST();
    expect(mockClearSessionCookie).toHaveBeenCalledWith();
  });
});
