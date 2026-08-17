import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLimit = vi.fn();

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(function Redis() {
    return {};
  }),
}));

vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow = vi.fn().mockReturnValue("sliding-window-config");
    limit = mockLimit;
  }
  return { Ratelimit };
});

import { checkRateLimit, getClientIdentifier } from "./rate-limit";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
});

describe("checkRateLimit", () => {
  it("allows the request when under the limit", async () => {
    mockLimit.mockResolvedValue({ success: true });
    await expect(checkRateLimit("applications", "1.2.3.4")).resolves.toBe(true);
  });

  it("blocks the request when over the limit", async () => {
    mockLimit.mockResolvedValue({ success: false });
    await expect(checkRateLimit("applications", "1.2.3.4")).resolves.toBe(false);
  });

  it("fails open (allows) when Upstash is not configured, logging loudly", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Re-import with cleared module cache so the missing-env-var branch is hit fresh.
    vi.resetModules();
    const fresh = await import("./rate-limit");
    await expect(fresh.checkRateLimit("applications", "1.2.3.4")).resolves.toBe(true);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("fails open (allows) instead of throwing when Upstash itself errors mid-request (e.g. a network blip)", async () => {
    mockLimit.mockRejectedValue(new Error("fetch failed"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(checkRateLimit("verificationEmail", "uid-1")).resolves.toBe(true);
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("getClientIdentifier", () => {
  it("prefers x-real-ip, which the platform sets and the client cannot override", () => {
    const request = new Request("http://localhost/api/applications", {
      headers: { "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIdentifier(request)).toBe("9.9.9.9");
  });

  it("falls back to the last (trusted-hop) entry of x-forwarded-for, never the client-spoofable first entry", () => {
    const request = new Request("http://localhost/api/applications", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIdentifier(request)).toBe("5.6.7.8");
  });

  it("returns 'unknown' when neither header is present", () => {
    const request = new Request("http://localhost/api/applications");
    expect(getClientIdentifier(request)).toBe("unknown");
  });
});
