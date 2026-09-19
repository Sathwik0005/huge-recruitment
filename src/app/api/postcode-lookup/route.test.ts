import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIdentifier: vi.fn().mockReturnValue("1.2.3.4"),
}));

vi.mock("@/lib/require-verified-session", () => ({
  requireVerifiedSession: vi.fn(),
}));

import { checkRateLimit } from "@/lib/rate-limit";
import { requireVerifiedSession } from "@/lib/require-verified-session";
import { GET } from "./route";

const mockCheckRateLimit = vi.mocked(checkRateLimit);
const mockRequireVerifiedSession = vi.mocked(requireVerifiedSession);
const mockFetch = vi.fn();

const verifiedUser = { id: "user-1" } as never;

function request(postcode?: string) {
  const url = new URL("http://localhost/api/postcode-lookup");
  if (postcode !== undefined) url.searchParams.set("postcode", postcode);
  return new Request(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue(true);
  mockRequireVerifiedSession.mockResolvedValue({ status: "ok", user: verifiedUser });
  vi.stubGlobal("fetch", mockFetch);
});

describe("GET /api/postcode-lookup", () => {
  it("rejects when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue(false);
    const response = await GET(request("S12BJ"));
    expect(response.status).toBe(429);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects when not verified", async () => {
    mockRequireVerifiedSession.mockResolvedValue({ status: "unauthenticated" });
    const response = await GET(request("S12BJ"));
    expect(response.status).toBe(401);
  });

  it("rejects a missing postcode", async () => {
    const response = await GET(request());
    expect(response.status).toBe(400);
  });

  it("returns mapped fields on a successful lookup", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        result: { postcode: "S1 2BJ", admin_district: "Sheffield", region: "Yorkshire and The Humber" },
      }),
    });

    const response = await GET(request("s1 2bj"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      townOrCity: "Sheffield",
      countyOrRegion: "Yorkshire and The Humber",
      postcode: "S1 2BJ",
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.postcodes.io/postcodes/S12BJ",
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("returns 404 when postcodes.io reports not found", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const response = await GET(request("XX00XX"));
    expect(response.status).toBe(404);
  });

  it("returns 502 when the upstream call throws", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));
    const response = await GET(request("S12BJ"));
    expect(response.status).toBe(502);
  });
});
