import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function Resend() {
    return { emails: { send: mockSend } };
  }),
}));

import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetLinkEmail } from "./auth-email";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubEnv("RESEND_FROM_EMAIL", "Huge Requirements Limited <info@hugerequirements.co.uk>");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
  mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
});

describe("sendVerificationEmail", () => {
  it("sends via Resend to the given address with the link as the CTA and in the plain-text fallback", async () => {
    await sendVerificationEmail({ email: "ann@example.com", link: "https://example.test/verify-email?oobCode=abc" });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const [payload] = mockSend.mock.calls[0];
    expect(payload.to).toBe("ann@example.com");
    expect(payload.from).toBe("Huge Requirements Limited <info@hugerequirements.co.uk>");
    expect(payload.html).toContain("https://example.test/verify-email?oobCode=abc");
    expect(payload.text).toContain("https://example.test/verify-email?oobCode=abc");
  });

  it("does not throw and skips sending when Resend is not configured, and reports failure", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(
      sendVerificationEmail({ email: "ann@example.com", link: "https://example.test/verify-email" }),
    ).resolves.toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("does not throw when the Resend API call itself fails, and reports failure", async () => {
    mockSend.mockRejectedValue(new Error("Resend is down"));
    await expect(
      sendVerificationEmail({ email: "ann@example.com", link: "https://example.test/verify-email" }),
    ).resolves.toBe(false);
  });

  it("does not throw when Resend returns a non-throwing { data, error } rejection, and reports failure", async () => {
    mockSend.mockResolvedValue({ data: null, error: { name: "validation_error", message: "Invalid recipient" } });
    await expect(
      sendVerificationEmail({ email: "ann@example.com", link: "https://example.test/verify-email" }),
    ).resolves.toBe(false);
  });

  it("reports success when Resend accepts the send", async () => {
    await expect(
      sendVerificationEmail({ email: "ann@example.com", link: "https://example.test/verify-email" }),
    ).resolves.toBe(true);
  });
});

describe("sendWelcomeEmail", () => {
  it("escapes an XSS-attempt firstName before interpolating into the HTML body", async () => {
    await sendWelcomeEmail({ email: "ann@example.com", firstName: "<script>alert(1)</script>" });

    const [payload] = mockSend.mock.calls[0];
    expect(payload.html).not.toContain("<script>alert(1)</script>");
    expect(payload.html).toContain("&lt;script&gt;");
  });

  it("passes idempotencyKey as the resend.emails.send SECOND argument, not a payload field", async () => {
    await sendWelcomeEmail({ email: "ann@example.com", firstName: "Ann", idempotencyKey: "welcome-user-1" });

    const [payload, options] = mockSend.mock.calls[0];
    expect(payload.idempotencyKey).toBeUndefined();
    expect(options).toEqual({ idempotencyKey: "welcome-user-1" });
  });

  it("does not throw and skips sending when Resend is not configured, and reports failure", async () => {
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    await expect(sendWelcomeEmail({ email: "ann@example.com", firstName: "Ann" })).resolves.toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe("sendPasswordResetLinkEmail", () => {
  it("sends via Resend with the reset link as the CTA", async () => {
    await sendPasswordResetLinkEmail({ email: "ann@example.com", link: "https://example.test/reset-password?oobCode=xyz" });

    const [payload] = mockSend.mock.calls[0];
    expect(payload.to).toBe("ann@example.com");
    expect(payload.html).toContain("https://example.test/reset-password?oobCode=xyz");
  });

  it("does not throw when the Resend API call itself fails, and reports failure", async () => {
    mockSend.mockRejectedValue(new Error("Resend is down"));
    await expect(
      sendPasswordResetLinkEmail({ email: "ann@example.com", link: "https://example.test/reset-password" }),
    ).resolves.toBe(false);
  });

  it("does not throw when Resend returns a non-throwing { data, error } rejection, and reports failure", async () => {
    mockSend.mockResolvedValue({ data: null, error: { name: "validation_error", message: "Invalid recipient" } });
    await expect(
      sendPasswordResetLinkEmail({ email: "ann@example.com", link: "https://example.test/reset-password" }),
    ).resolves.toBe(false);
  });
});
