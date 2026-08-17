import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/firebase/admin", () => ({
  verifyIdToken: vi.fn(),
  generateEmailVerificationLink: vi.fn(),
}));

vi.mock("@/lib/auth-email", () => ({
  sendVerificationEmail: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

import { verifyIdToken, generateEmailVerificationLink } from "@/firebase/admin";
import { sendVerificationEmail } from "@/lib/auth-email";
import { checkRateLimit } from "@/lib/rate-limit";
import { POST } from "./route";

const mockVerifyIdToken = vi.mocked(verifyIdToken);
const mockGenerateLink = vi.mocked(generateEmailVerificationLink);
const mockSendVerificationEmail = vi.mocked(sendVerificationEmail);
const mockCheckRateLimit = vi.mocked(checkRateLimit);

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/send-verification-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
  mockCheckRateLimit.mockResolvedValue(true);
  mockGenerateLink.mockResolvedValue("https://example.test/verify-email?mode=verifyEmail&oobCode=abc");
  mockSendVerificationEmail.mockResolvedValue(undefined);
});

describe("POST /api/auth/send-verification-email", () => {
  it("returns 400 when idToken is missing", async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("returns 401 when the idToken fails verification", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("bad token"));

    const response = await POST(makeRequest({ idToken: "bad" }));

    expect(response.status).toBe(401);
    expect(mockGenerateLink).not.toHaveBeenCalled();
  });

  it("returns 429 when rate-limited, without generating a link", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "uid-1", email: "a@b.com" } as never);
    mockCheckRateLimit.mockResolvedValue(false);

    const response = await POST(makeRequest({ idToken: "token" }));

    expect(response.status).toBe(429);
    expect(mockGenerateLink).not.toHaveBeenCalled();
  });

  it("happy path: rate-limits by uid, generates a handleCodeInApp link at /verify-email, sends the email, returns 200", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "uid-1", email: "a@b.com" } as never);

    const response = await POST(makeRequest({ idToken: "token" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(mockCheckRateLimit).toHaveBeenCalledWith("verificationEmail", "uid-1");
    expect(mockGenerateLink).toHaveBeenCalledWith("a@b.com", {
      url: "https://example.test/verify-email",
      handleCodeInApp: true,
    });
    expect(mockSendVerificationEmail).toHaveBeenCalledWith({
      email: "a@b.com",
      link: "https://example.test/verify-email?mode=verifyEmail&oobCode=abc",
    });
  });

  it("surfaces a real error (not a fake success) when link generation fails — the user cannot proceed without this email", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "uid-1", email: "a@b.com" } as never);
    mockGenerateLink.mockRejectedValue(new Error("firebase down"));

    const response = await POST(makeRequest({ idToken: "token" }));

    expect(response.status).toBe(500);
    expect(mockSendVerificationEmail).not.toHaveBeenCalled();
  });
});
