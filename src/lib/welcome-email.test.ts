import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
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
const mockSendWelcomeEmail = vi.mocked(sendWelcomeEmail);

const USER = { id: "user-1", email: "ann@example.com", firstName: "Ann" };

beforeEach(() => {
  vi.clearAllMocks();
  mockSendWelcomeEmail.mockResolvedValue(undefined);
});

describe("sendWelcomeEmailOnce", () => {
  it("claims the guard atomically (updateMany scoped to welcomeEmailSentAt: null) and sends when the claim is won", async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 } as never);

    await sendWelcomeEmailOnce(USER);

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: "user-1", welcomeEmailSentAt: null },
      data: { welcomeEmailSentAt: expect.any(Date) },
    });
    expect(mockSendWelcomeEmail).toHaveBeenCalledWith({
      email: "ann@example.com",
      firstName: "Ann",
      idempotencyKey: "welcome-user-1",
    });
  });

  it("does not send when the claim is lost (count 0 — already sent, or a concurrent caller won the race)", async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 } as never);

    await sendWelcomeEmailOnce(USER);

    expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
  });

  it("swallows a thrown updateMany error and never sends — does not throw", async () => {
    mockUpdateMany.mockRejectedValue(new Error("db unreachable"));

    await expect(sendWelcomeEmailOnce(USER)).resolves.toBeUndefined();
    expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
  });
});
