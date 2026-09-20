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
      update: vi.fn(),
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
const mockUpdate = vi.mocked(prisma.candidateProfile.update);

const verifiedUser = { id: "user-1" } as never;

const validSubmit = {
  intent: "submit",
  declarationFullName: "Sathwik User",
  declarationAccepted: true,
};

function request(body: unknown) {
  return new Request("http://localhost/api/candidate/profile/step-4", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue(true);
  mockRequireVerifiedSession.mockResolvedValue({ status: "ok", user: verifiedUser });
  mockUpsert.mockResolvedValue({ id: "profile-1", avatarS3Key: null } as never);
  mockUpdate.mockResolvedValue({ id: "profile-1", onboardingStep: 4 } as never);
});

describe("POST /api/candidate/profile/step-4", () => {
  it("rejects when rate limited before touching the session", async () => {
    mockCheckRateLimit.mockResolvedValue(false);
    const response = await POST(request(validSubmit));
    expect(response.status).toBe(429);
    expect(mockRequireVerifiedSession).not.toHaveBeenCalled();
  });

  it("rejects when not verified", async () => {
    mockRequireVerifiedSession.mockResolvedValue({ status: "unauthenticated" });
    const response = await POST(request(validSubmit));
    expect(response.status).toBe(401);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("rejects a missing full name without writing to the DB", async () => {
    const response = await POST(request({ intent: "submit", declarationFullName: "", declarationAccepted: true }));
    expect(response.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("rejects when the declaration checkbox is not accepted", async () => {
    const response = await POST(
      request({ intent: "submit", declarationFullName: "Sathwik User", declarationAccepted: false }),
    );
    expect(response.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 400 for an unparseable JSON body", async () => {
    const response = await POST(
      new Request("http://localhost/api/candidate/profile/step-4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }),
    );
    expect(response.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("blocks submission when the profile has no avatar, but still persists the declaration fields", async () => {
    mockUpsert.mockResolvedValue({ id: "profile-1", avatarS3Key: null } as never);
    const response = await POST(request(validSubmit));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.field).toBe("avatar");
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const args = mockUpsert.mock.calls[0][0];
    expect(args.update).toMatchObject({ declarationFullName: "Sathwik User" });
    expect(args.update.declarationAcceptedAt).toBeInstanceOf(Date);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("never trusts a client-supplied user id — always resolves via the verified session", async () => {
    mockUpsert.mockResolvedValue({ id: "profile-1", avatarS3Key: "candidates/user-1/avatar/x.png" } as never);
    await POST(request({ ...validSubmit, userId: "someone-else" }));
    const args = mockUpsert.mock.calls[0][0];
    expect(args.where).toEqual({ userId: "user-1" });
    expect(args.create).toEqual({ userId: "user-1", declarationFullName: "Sathwik User", declarationAcceptedAt: expect.any(Date) });
  });

  it("advances onboardingStep, sets step4CompletedAt, and clears editingUnlockedByAdmin when the avatar is already set", async () => {
    mockUpsert.mockResolvedValue({ id: "profile-1", avatarS3Key: "candidates/user-1/avatar/x.png" } as never);
    const response = await POST(request(validSubmit));
    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const args = mockUpdate.mock.calls[0][0];
    expect(args.where).toEqual({ userId: "user-1" });
    expect(args.data).toMatchObject({ onboardingStep: 4, editingUnlockedByAdmin: false });
    expect(args.data.step4CompletedAt).toBeInstanceOf(Date);
  });
});
