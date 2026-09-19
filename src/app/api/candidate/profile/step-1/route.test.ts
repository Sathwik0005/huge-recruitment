import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIdentifier: vi.fn().mockReturnValue("1.2.3.4"),
}));

vi.mock("@/lib/require-verified-session", () => ({
  requireVerifiedSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    candidateProfile: {
      upsert: vi.fn(),
    },
  },
}));

import { checkRateLimit } from "@/lib/rate-limit";
import { requireVerifiedSession } from "@/lib/require-verified-session";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const mockCheckRateLimit = vi.mocked(checkRateLimit);
const mockRequireVerifiedSession = vi.mocked(requireVerifiedSession);
const mockUpsert = vi.mocked(prisma.candidateProfile.upsert);

const verifiedUser = { id: "user-1" } as never;

function request(body: unknown) {
  return new Request("http://localhost/api/candidate/profile/step-1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue(true);
  mockRequireVerifiedSession.mockResolvedValue({ status: "ok", user: verifiedUser });
  mockUpsert.mockResolvedValue({ id: "profile-1" } as never);
});

describe("POST /api/candidate/profile/step-1", () => {
  it("rejects when rate limited before touching the session", async () => {
    mockCheckRateLimit.mockResolvedValue(false);
    const response = await POST(request({ intent: "draft" }));
    expect(response.status).toBe(429);
    expect(mockRequireVerifiedSession).not.toHaveBeenCalled();
  });

  it("rejects when not verified", async () => {
    mockRequireVerifiedSession.mockResolvedValue({ status: "unauthenticated" });
    const response = await POST(request({ intent: "draft" }));
    expect(response.status).toBe(401);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("saves a partial draft without requiring all fields", async () => {
    const response = await POST(request({ intent: "draft", firstName: "John" }));
    expect(response.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const args = mockUpsert.mock.calls[0][0];
    expect(args.where).toEqual({ userId: "user-1" });
    expect(args.create).not.toHaveProperty("onboardingStep");
    expect(args.update).not.toHaveProperty("onboardingStep");
  });

  it("rejects an incomplete continue payload", async () => {
    const response = await POST(request({ intent: "continue", firstName: "John" }));
    expect(response.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("advances onboardingStep and sets step1CompletedAt on a valid continue", async () => {
    const response = await POST(
      request({
        intent: "continue",
        title: "MR",
        firstName: "John",
        surname: "Smith",
        gender: "MALE",
        dateOfBirth: "1992-06-14",
        nationality: "GB",
        niNumber: "AB123456C",
        isStudying: false,
        hasUnspentConvictions: false,
        mobileDialCode: "+44",
        mobileNumber: "7700 900077",
        addressLine1: "543 Acero Building",
        townOrCity: "Sheffield",
        postcode: "S1 2BJ",
      }),
    );

    expect(response.status).toBe(200);
    const args = mockUpsert.mock.calls[0][0];
    expect(args.create).toMatchObject({ onboardingStep: 2 });
    expect(args.update).toMatchObject({ onboardingStep: 2 });
    expect(args.create.step1CompletedAt).toBeInstanceOf(Date);
  });

  it("returns 400 for an unparseable body", async () => {
    const response = await POST(
      new Request("http://localhost/api/candidate/profile/step-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }),
    );
    expect(response.status).toBe(400);
  });
});
