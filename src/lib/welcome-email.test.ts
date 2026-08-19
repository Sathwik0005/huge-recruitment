import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-email", () => ({
  sendWelcomeEmail: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/auth-email";
import { sendWelcomeEmailOnce } from "./welcome-email";

const mockUpdateMany = vi.mocked(prisma.user.updateMany);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockSendWelcomeEmail = vi.mocked(sendWelcomeEmail);

const USER = { id: "user-1", email: "ann@example.com", firstName: "Ann" };

beforeEach(() => {
  vi.clearAllMocks();
  mockFindUnique.mockResolvedValue({ welcomeEmailSentAt: null } as never);
  mockSendWelcomeEmail.mockResolvedValue(true);
  mockUpdateMany.mockResolvedValue({ count: 1 } as never);
});

describe("sendWelcomeEmailOnce", () => {
  it("records welcomeEmailSentAt only after the provider accepts the email", async () => {
    await sendWelcomeEmailOnce(USER);

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { welcomeEmailSentAt: true },
    });
    expect(mockSendWelcomeEmail).toHaveBeenCalledWith({
      email: "ann@example.com",
      firstName: "Ann",
      idempotencyKey: "welcome-user-1",
    });
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: "user-1", welcomeEmailSentAt: null },
      data: { welcomeEmailSentAt: expect.any(Date) },
    });
  });

  it("does not send when the database says the welcome email was already sent", async () => {
    mockFindUnique.mockResolvedValue({ welcomeEmailSentAt: new Date("2026-08-17T00:00:00Z") } as never);

    await sendWelcomeEmailOnce(USER);

    expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("does not send when the status lookup fails", async () => {
    mockFindUnique.mockRejectedValue(new Error("db unreachable"));

    await expect(sendWelcomeEmailOnce(USER)).resolves.toBeUndefined();
    expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("does not mark the email as sent when the provider rejects it", async () => {
    mockSendWelcomeEmail.mockResolvedValue(false);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendWelcomeEmailOnce(USER)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("not accepted"), "user-1");
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("does not throw when the provider accepted the email but recording its status fails", async () => {
    mockUpdateMany.mockRejectedValue(new Error("db unreachable"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendWelcomeEmailOnce(USER)).resolves.toBeUndefined();
    expect(mockSendWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("accepted but its status could not be recorded"),
      "user-1",
      expect.any(Object),
    );
  });
});