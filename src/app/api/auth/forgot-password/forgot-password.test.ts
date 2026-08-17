import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/firebase/admin", () => ({
  generatePasswordResetLink: vi.fn(),
}));

vi.mock("@/lib/auth-email", () => ({
  sendPasswordResetLinkEmail: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIdentifier: vi.fn().mockReturnValue("1.2.3.4"),
}));

import { generatePasswordResetLink } from "@/firebase/admin";
import { sendPasswordResetLinkEmail } from "@/lib/auth-email";
import { checkRateLimit } from "@/lib/rate-limit";
import { POST } from "./route";

const mockGenerateLink = vi.mocked(generatePasswordResetLink);
const mockSendEmail = vi.mocked(sendPasswordResetLinkEmail);
const mockCheckRateLimit = vi.mocked(checkRateLimit);

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "huge-recruitment.firebaseapp.com");
  mockCheckRateLimit.mockResolvedValue(true);
  mockGenerateLink.mockResolvedValue(
    "https://huge-recruitment.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=abc&apiKey=fake-key",
  );
  mockSendEmail.mockResolvedValue(true);
});

describe("POST /api/auth/forgot-password", () => {
  it("returns 400 for a missing/empty email", async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it("anti-enumeration: an existing account and a nonexistent account get byte-identical 200 responses", async () => {
    const realResponse = await POST(makeRequest({ email: "real@example.com" }));
    const realJson = await realResponse.json();

    mockGenerateLink.mockRejectedValueOnce({ code: "auth/user-not-found" });
    const fakeResponse = await POST(makeRequest({ email: "nobody@example.com" }));
    const fakeJson = await fakeResponse.json();

    expect(realResponse.status).toBe(fakeResponse.status);
    expect(realJson).toEqual(fakeJson);
  });

  it("sends the branded reset email, using the transformed /auth/action link, only when the account genuinely exists", async () => {
    await POST(makeRequest({ email: "real@example.com" }));

    expect(mockGenerateLink).toHaveBeenCalledWith("real@example.com", {
      url: "https://example.test/reset-password",
      handleCodeInApp: true,
    });
    expect(mockSendEmail).toHaveBeenCalledWith({
      email: "real@example.com",
      link: "https://example.test/auth/action?mode=resetPassword&oobCode=abc&apiKey=fake-key",
    });
  });

  it("does not send an email for a nonexistent account, but still returns the generic 200", async () => {
    mockGenerateLink.mockRejectedValue({ code: "auth/user-not-found" });

    const response = await POST(makeRequest({ email: "nobody@example.com" }));

    expect(response.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("still returns the generic 200 (not an error, not a distinguishable status) when rate-limited", async () => {
    mockCheckRateLimit.mockResolvedValue(false);

    const response = await POST(makeRequest({ email: "real@example.com" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(mockGenerateLink).not.toHaveBeenCalled();
  });

  it("rate-limits by client IP, not by email (caller is unauthenticated)", async () => {
    await POST(makeRequest({ email: "real@example.com" }));
    expect(mockCheckRateLimit).toHaveBeenCalledWith("forgotPassword", "1.2.3.4");
  });

  it("still returns the same generic 200 (anti-enumeration) when Resend rejects the send without throwing", async () => {
    mockSendEmail.mockResolvedValue(false);

    const response = await POST(makeRequest({ email: "real@example.com" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });
});
