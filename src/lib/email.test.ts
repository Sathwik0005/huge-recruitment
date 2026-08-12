import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function Resend() {
    return { emails: { send: mockSend } };
  }),
}));

import { sendAdminApplicationNotification } from "./email";

const INPUT = {
  applicationId: "app-1",
  publicReference: "APP-ABC123",
  jobTitle: "Warehouse Operative",
  jobReferenceCode: "HR-001",
  fullName: "Jane Doe",
  email: "jane@example.com",
  phone: "07123456789",
  location: "Foston",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubEnv("RESEND_FROM_EMAIL", "noreply@example.com");
  vi.stubEnv("RESEND_ADMIN_NOTIFICATION_EMAIL", "admin@example.com");
  mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
});

describe("sendAdminApplicationNotification", () => {
  it("sends via Resend with the candidate details", async () => {
    await sendAdminApplicationNotification(INPUT);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0][0];
    expect(call.to).toBe("admin@example.com");
    expect(call.from).toBe("noreply@example.com");
    expect(call.html).toContain("Jane Doe");
  });

  it("HTML-escapes a candidate name containing a script tag", async () => {
    await sendAdminApplicationNotification({ ...INPUT, fullName: '<script>alert(1)</script>' });
    const call = mockSend.mock.calls[0][0];
    expect(call.html).not.toContain("<script>");
    expect(call.html).toContain("&lt;script&gt;");
  });

  it("never includes a CV attachment or a CV URL in the payload", async () => {
    await sendAdminApplicationNotification(INPUT);
    const call = mockSend.mock.calls[0][0];
    expect(call.attachments).toBeUndefined();
    expect(JSON.stringify(call)).not.toMatch(/cv|blob/i);
  });

  it("does not throw when Resend is not configured, and skips sending", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(sendAdminApplicationNotification(INPUT)).resolves.toBeUndefined();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("does not throw when the Resend API call itself fails", async () => {
    mockSend.mockRejectedValue(new Error("Resend is down"));
    await expect(sendAdminApplicationNotification(INPUT)).resolves.toBeUndefined();
  });
});
