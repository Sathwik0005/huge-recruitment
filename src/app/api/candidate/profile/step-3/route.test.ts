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

const validPassportSubmit = {
  intent: "submit",
  rightToWorkDocumentType: "PASSPORT",
  rightToWorkDocFrontS3Key: "k1",
  rightToWorkDocBackS3Key: "k2",
  visaExpiryDate: "2030-01-01",
  rightToWorkShareCode: "W12345678",
  bankAccountHolderName: "Sathwik User",
  bankAccountNumber: "12345678",
  bankSortCode: "20-45-78",
  bankStatementS3Key: "candidates/user-1/step-3/bankStatement/x.pdf",
};

function request(body: unknown) {
  return new Request("http://localhost/api/candidate/profile/step-3", {
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
  mockUpdate.mockResolvedValue({ id: "profile-1", onboardingStep: 3 } as never);
});

describe("POST /api/candidate/profile/step-3", () => {
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

  it("rejects an unparseable/invalid body without writing to the DB", async () => {
    const response = await POST(request({ intent: "submit" }));
    expect(response.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("saves a partial draft without requiring branch fields", async () => {
    const response = await POST(request({ intent: "draft", bankAccountHolderName: "Sathwik" }));
    expect(response.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
    const args = mockUpsert.mock.calls[0][0];
    expect(args.where).toEqual({ userId: "user-1" });
    expect(args.create).not.toHaveProperty("onboardingStep");
  });

  it("blocks a valid submit when the profile has no avatar, but still persists the fields", async () => {
    mockUpsert.mockResolvedValue({ id: "profile-1", avatarS3Key: null } as never);
    const response = await POST(request(validPassportSubmit));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.field).toBe("avatar");
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("advances onboardingStep and sets step3CompletedAt when the avatar is already set", async () => {
    mockUpsert.mockResolvedValue({ id: "profile-1", avatarS3Key: "candidates/user-1/avatar/x.png" } as never);
    const response = await POST(request(validPassportSubmit));
    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const args = mockUpdate.mock.calls[0][0];
    expect(args.data).toMatchObject({ onboardingStep: 3 });
    expect(args.data.step3CompletedAt).toBeInstanceOf(Date);
  });

  it("succeeds end-to-end for the ID card branch", async () => {
    mockUpsert.mockResolvedValue({ id: "profile-1", avatarS3Key: "key.png" } as never);
    const response = await POST(
      request({
        intent: "submit",
        rightToWorkDocumentType: "ID_CARD",
        rightToWorkDocFrontS3Key: "k1",
        rightToWorkDocBackS3Key: "k2",
        rightToWorkShareCode: "W12345678",
        rightToWorkShareCodeExpiryDate: "2030-01-01",
        bankAccountHolderName: "Sathwik User",
        bankAccountNumber: "12345678",
        bankSortCode: "204578",
        bankStatementS3Key: "k3",
      }),
    );
    expect(response.status).toBe(200);
  });

  it("succeeds end-to-end for the BRP physical branch", async () => {
    mockUpsert.mockResolvedValue({ id: "profile-1", avatarS3Key: "key.png" } as never);
    const response = await POST(
      request({
        intent: "submit",
        rightToWorkDocumentType: "BRP_EVISA",
        brpSubtype: "PHYSICAL_BRP",
        rightToWorkDocFrontS3Key: "k1",
        rightToWorkDocBackS3Key: "k2",
        bankAccountHolderName: "Sathwik User",
        bankAccountNumber: "12345678",
        bankSortCode: "204578",
        bankStatementS3Key: "k3",
      }),
    );
    expect(response.status).toBe(200);
  });

  it("succeeds end-to-end for the BRP e-visa branch", async () => {
    mockUpsert.mockResolvedValue({ id: "profile-1", avatarS3Key: "key.png" } as never);
    const response = await POST(
      request({
        intent: "submit",
        rightToWorkDocumentType: "BRP_EVISA",
        brpSubtype: "EVISA",
        rightToWorkShareCode: "W12345678",
        rightToWorkShareCodeExpiryDate: "2030-01-01",
        bankAccountHolderName: "Sathwik User",
        bankAccountNumber: "12345678",
        bankSortCode: "204578",
        bankStatementS3Key: "k3",
      }),
    );
    expect(response.status).toBe(200);
  });

  it("returns 400 for an unparseable JSON body", async () => {
    const response = await POST(
      new Request("http://localhost/api/candidate/profile/step-3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }),
    );
    expect(response.status).toBe(400);
  });
});
