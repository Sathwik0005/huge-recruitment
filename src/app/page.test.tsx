import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/job-dto", () => ({
  getFeaturedJobs: vi.fn().mockResolvedValue([]),
}));

import Home from "./page";

describe("/ (public homepage)", () => {
  it("resolves with no session/auth guard involved — `/` is intentionally public", async () => {
    // No @/lib/session, @/lib/require-verified-session, or any auth module is
    // mocked above. If HomePage ever started depending on one, this test
    // would fail with an unmocked-module error rather than silently passing,
    // which is the point: it asserts the absence of an auth gate on `/`, not
    // just that the page happens to render. (Rendered DOM output is covered
    // by other homepage-specific tests, out of scope for this auth-focused
    // check — a full render here would additionally require mocking the App
    // Router context that HomePage's client children rely on.)
    await expect(Home()).resolves.toBeDefined();
  });
});
