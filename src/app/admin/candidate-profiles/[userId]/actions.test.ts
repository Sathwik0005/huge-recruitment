import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/require-admin-session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    candidateProfile: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    candidateWorkReference: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/candidate-documents", () => ({
  getSignedDocumentUrl: vi.fn(),
}));

vi.mock("@/lib/s3", () => ({
  deleteS3Object: vi.fn(),
}));

import { requireAdminSession } from "@/lib/require-admin-session";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSignedDocumentUrl } from "@/lib/candidate-documents";
import { deleteS3Object } from "@/lib/s3";
import {
  updateCandidateStep1,
  updateCandidateStep2,
  updateCandidateStep3,
  updateCandidateWorkReferences,
  getDocumentViewUrl,
  clearCandidateAvatar,
  clearCandidateDocument,
} from "./actions";

const mockRequireAdminSession = vi.mocked(requireAdminSession);
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockProfileUpdate = vi.mocked(prisma.candidateProfile.update);
const mockProfileFindUnique = vi.mocked(prisma.candidateProfile.findUnique);
const mockWorkRefDeleteMany = vi.mocked(prisma.candidateWorkReference.deleteMany);
const mockWorkRefCreateMany = vi.mocked(prisma.candidateWorkReference.createMany);
const mockTransaction = vi.mocked(prisma.$transaction);
const mockGetSignedDocumentUrl = vi.mocked(getSignedDocumentUrl);
const mockDeleteS3Object = vi.mocked(deleteS3Object);

const ADMIN_USER = { id: "admin-1", role: "ADMIN", status: "ACTIVE" };
const USER_ID = "user-123";

const NON_OK_STATUSES = ["unauthenticated", "unverified", "no-db-user", "forbidden"] as const;

beforeEach(() => {
  vi.clearAllMocks();
  mockTransaction.mockImplementation(async (callback: unknown) => {
    if (typeof callback === "function") {
      return callback({
        candidateWorkReference: {
          deleteMany: mockWorkRefDeleteMany,
          createMany: mockWorkRefCreateMany,
        },
      } as never);
    }
    return undefined;
  });
});

describe("updateCandidateStep1", () => {
  it.each(NON_OK_STATUSES)("rejects when requireAdminSession status is %s, without touching Prisma", async (status) => {
    mockRequireAdminSession.mockResolvedValue({ status } as never);

    const result = await updateCandidateStep1(USER_ID, { firstName: "Jordan" });

    expect(result.success).toBe(false);
    expect(mockProfileUpdate).not.toHaveBeenCalled();
  });

  it("rejects an empty userId without calling Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);

    const result = await updateCandidateStep1("", { firstName: "Jordan" });

    expect(result.success).toBe(false);
    expect(mockProfileUpdate).not.toHaveBeenCalled();
  });

  it("rejects an invalid NI number without calling Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);

    const result = await updateCandidateStep1(USER_ID, { niNumber: "QQ123456C" });

    expect(result.success).toBe(false);
    expect(mockProfileUpdate).not.toHaveBeenCalled();
  });

  it("updates the profile scoped to the userId argument on valid input and revalidates the detail page", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileUpdate.mockResolvedValue({} as never);

    const result = await updateCandidateStep1(USER_ID, { firstName: "Jordan" });

    expect(result.success).toBe(true);
    expect(mockProfileUpdate).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { firstName: "Jordan" },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/admin/candidate-profiles/${USER_ID}`);
  });

  it("never writes onboardingStep or stepXCompletedAt even if present in the input payload", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileUpdate.mockResolvedValue({} as never);

    await updateCandidateStep1(USER_ID, {
      firstName: "Jordan",
      onboardingStep: 3,
      step1CompletedAt: "2024-01-01",
    } as never);

    const data = mockProfileUpdate.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("onboardingStep");
    expect(data).not.toHaveProperty("step1CompletedAt");
  });

  it("returns a generic error and does not leak the raw exception when Prisma throws", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileUpdate.mockRejectedValue(new Error("connection reset"));

    const result = await updateCandidateStep1(USER_ID, { firstName: "Jordan" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).not.toContain("connection reset");
  });
});

describe("updateCandidateStep2", () => {
  it("rejects when the caller is not an admin, without touching Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "forbidden" });

    const result = await updateCandidateStep2(USER_ID, { preferredWorkLocation: "Leeds" });

    expect(result.success).toBe(false);
    expect(mockProfileUpdate).not.toHaveBeenCalled();
  });

  it("rejects an invalid shoeSize increment without calling Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);

    const result = await updateCandidateStep2(USER_ID, { shoeSize: 7.3 });

    expect(result.success).toBe(false);
    expect(mockProfileUpdate).not.toHaveBeenCalled();
  });

  it("strips workReferences from the payload (handled by a separate action)", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileUpdate.mockResolvedValue({} as never);

    await updateCandidateStep2(USER_ID, {
      preferredWorkLocation: "Leeds",
      workReferences: [{ jobTitle: "x" }],
    });

    const data = mockProfileUpdate.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("workReferences");
  });

  it("updates on valid input and revalidates the detail page", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileUpdate.mockResolvedValue({} as never);

    const result = await updateCandidateStep2(USER_ID, { preferredWorkLocation: "Leeds" });

    expect(result.success).toBe(true);
    expect(mockProfileUpdate).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { preferredWorkLocation: "Leeds" },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/admin/candidate-profiles/${USER_ID}`);
  });
});

describe("updateCandidateStep3", () => {
  it("rejects when the caller is not an admin, without touching Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "unauthenticated" });

    const result = await updateCandidateStep3(USER_ID, { bankAccountNumber: "12345678" });

    expect(result.success).toBe(false);
    expect(mockProfileUpdate).not.toHaveBeenCalled();
  });

  it("rejects an invalid bank account number (not exactly 8 digits) without calling Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);

    const result = await updateCandidateStep3(USER_ID, { bankAccountNumber: "1234567" });

    expect(result.success).toBe(false);
    expect(mockProfileUpdate).not.toHaveBeenCalled();
  });

  it("rejects an invalid sort code without calling Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);

    const result = await updateCandidateStep3(USER_ID, { bankSortCode: "12-34-5" });

    expect(result.success).toBe(false);
    expect(mockProfileUpdate).not.toHaveBeenCalled();
  });

  it("rejects an invalid share code without calling Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);

    const result = await updateCandidateStep3(USER_ID, { rightToWorkShareCode: "SHORT" });

    expect(result.success).toBe(false);
    expect(mockProfileUpdate).not.toHaveBeenCalled();
  });

  it("updates on valid input, scoped to the userId argument, and revalidates the detail page", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileUpdate.mockResolvedValue({} as never);

    const result = await updateCandidateStep3(USER_ID, { bankAccountNumber: "12345678" });

    expect(result.success).toBe(true);
    expect(mockProfileUpdate).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { bankAccountNumber: "12345678" },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/admin/candidate-profiles/${USER_ID}`);
  });

  it("never writes step3CompletedAt or onboardingStep even if present in the input payload", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileUpdate.mockResolvedValue({} as never);

    await updateCandidateStep3(USER_ID, {
      bankAccountNumber: "12345678",
      step3CompletedAt: "2024-01-01",
      onboardingStep: 3,
    } as never);

    const data = mockProfileUpdate.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("step3CompletedAt");
    expect(data).not.toHaveProperty("onboardingStep");
  });
});

describe("updateCandidateWorkReferences", () => {
  const validReference = {
    jobTitle: "Warehouse Operative",
    companyName: "Acme Logistics",
    startDate: "2023-01-01",
    isCurrentJob: false,
    endDate: "2023-06-01",
  };

  it("rejects when the caller is not an admin, without touching Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "forbidden" });

    const result = await updateCandidateWorkReferences(USER_ID, [validReference]);

    expect(result.success).toBe(false);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects an invalid reference row (missing jobTitle) without starting a transaction", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    const { jobTitle: _jobTitle, ...invalidReference } = validReference;

    const result = await updateCandidateWorkReferences(USER_ID, [invalidReference]);

    expect(result.success).toBe(false);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects a reference missing endDate when isCurrentJob is false", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);

    const result = await updateCandidateWorkReferences(USER_ID, [
      { ...validReference, isCurrentJob: false, endDate: "" },
    ]);

    expect(result.success).toBe(false);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects a reference with an endDate supplied while isCurrentJob is true", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);

    const result = await updateCandidateWorkReferences(USER_ID, [
      { ...validReference, isCurrentJob: true, endDate: "2023-06-01" },
    ]);

    expect(result.success).toBe(false);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns an error when the candidate has no profile", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileFindUnique.mockResolvedValue(null);

    const result = await updateCandidateWorkReferences(USER_ID, [validReference]);

    expect(result.success).toBe(false);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("replaces the full set via delete-and-recreate inside a transaction, scoped to the profile id", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileFindUnique.mockResolvedValue({ id: "profile-1", userId: USER_ID } as never);

    const result = await updateCandidateWorkReferences(USER_ID, [validReference]);

    expect(result.success).toBe(true);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockWorkRefDeleteMany).toHaveBeenCalledWith({ where: { candidateProfileId: "profile-1" } });
    expect(mockWorkRefCreateMany).toHaveBeenCalledTimes(1);
    const createManyArgs = mockWorkRefCreateMany.mock.calls[0]![0]!;
    const data = createManyArgs.data as Array<Record<string, unknown>>;
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ candidateProfileId: "profile-1", displayOrder: 0 });
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/admin/candidate-profiles/${USER_ID}`);
  });

  it("clears all rows and creates none when an empty array is submitted", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileFindUnique.mockResolvedValue({ id: "profile-1", userId: USER_ID } as never);

    const result = await updateCandidateWorkReferences(USER_ID, []);

    expect(result.success).toBe(true);
    expect(mockWorkRefDeleteMany).toHaveBeenCalledWith({ where: { candidateProfileId: "profile-1" } });
    expect(mockWorkRefCreateMany).not.toHaveBeenCalled();
  });

  it("assigns fresh sequential displayOrder values based on submitted array order", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileFindUnique.mockResolvedValue({ id: "profile-1", userId: USER_ID } as never);

    await updateCandidateWorkReferences(USER_ID, [
      validReference,
      { ...validReference, jobTitle: "Second Job" },
    ]);

    const createManyArgs = mockWorkRefCreateMany.mock.calls[0]![0]!;
    const data = createManyArgs.data as Array<Record<string, unknown>>;
    expect(data[0]).toMatchObject({ displayOrder: 0 });
    expect(data[1]).toMatchObject({ displayOrder: 1 });
  });

  it("returns a generic error and does not leak the raw exception when the transaction throws", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileFindUnique.mockResolvedValue({ id: "profile-1", userId: USER_ID } as never);
    mockTransaction.mockRejectedValue(new Error("connection reset"));

    const result = await updateCandidateWorkReferences(USER_ID, [validReference]);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).not.toContain("connection reset");
  });
});

describe("getDocumentViewUrl", () => {
  it("rejects when the caller is not an admin, without querying Prisma", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "unauthenticated" });

    const result = await getDocumentViewUrl(USER_ID, "bankStatement");

    expect(result.success).toBe(false);
    expect(mockProfileFindUnique).not.toHaveBeenCalled();
  });

  it("returns an error when the candidate has no profile", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileFindUnique.mockResolvedValue(null);

    const result = await getDocumentViewUrl(USER_ID, "bankStatement");

    expect(result.success).toBe(false);
    expect(mockGetSignedDocumentUrl).not.toHaveBeenCalled();
  });

  it("returns a failure when the requested slot's S3 key is null", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileFindUnique.mockResolvedValue({ bankStatementS3Key: null } as never);

    const result = await getDocumentViewUrl(USER_ID, "bankStatement");

    expect(result.success).toBe(false);
    expect(mockGetSignedDocumentUrl).not.toHaveBeenCalled();
  });

  it("returns a signed URL for the correct slot's key when it exists", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileFindUnique.mockResolvedValue({
      rightToWorkDocFrontS3Key: "candidates/user-123/step-3/rightToWorkFront/abc.png",
      bankStatementS3Key: null,
    } as never);
    mockGetSignedDocumentUrl.mockResolvedValue("https://signed.example/doc.png");

    const result = await getDocumentViewUrl(USER_ID, "rightToWorkFront");

    expect(result).toEqual({ success: true, data: { url: "https://signed.example/doc.png" } });
    expect(mockGetSignedDocumentUrl).toHaveBeenCalledWith("candidates/user-123/step-3/rightToWorkFront/abc.png");
  });
});

describe("clearCandidateAvatar", () => {
  it.each(NON_OK_STATUSES)("rejects when requireAdminSession status is %s, without touching Prisma or S3", async (status) => {
    mockRequireAdminSession.mockResolvedValue({ status } as never);

    const result = await clearCandidateAvatar(USER_ID);

    expect(result.success).toBe(false);
    expect(mockProfileFindUnique).not.toHaveBeenCalled();
    expect(mockProfileUpdate).not.toHaveBeenCalled();
    expect(mockDeleteS3Object).not.toHaveBeenCalled();
  });

  it("deletes the S3 object (key read from the DB row) then nulls avatarS3Key", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileFindUnique.mockResolvedValue({ avatarS3Key: "candidates/user-123/avatar/abc.png" } as never);
    mockDeleteS3Object.mockResolvedValue(undefined);
    mockProfileUpdate.mockResolvedValue({} as never);

    const result = await clearCandidateAvatar(USER_ID);

    expect(result.success).toBe(true);
    expect(mockDeleteS3Object).toHaveBeenCalledWith("candidates/user-123/avatar/abc.png");
    expect(mockProfileUpdate).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { avatarS3Key: null },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/admin/candidate-profiles/${USER_ID}`);
  });

  it("skips the S3 call when avatarS3Key is already null, but still clears the DB row", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileFindUnique.mockResolvedValue({ avatarS3Key: null } as never);
    mockProfileUpdate.mockResolvedValue({} as never);

    const result = await clearCandidateAvatar(USER_ID);

    expect(result.success).toBe(true);
    expect(mockDeleteS3Object).not.toHaveBeenCalled();
    expect(mockProfileUpdate).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { avatarS3Key: null },
    });
  });

  it("does not clear the DB reference when the S3 delete fails", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileFindUnique.mockResolvedValue({ avatarS3Key: "candidates/user-123/avatar/abc.png" } as never);
    mockDeleteS3Object.mockRejectedValue(new Error("AccessDenied"));

    const result = await clearCandidateAvatar(USER_ID);

    expect(result.success).toBe(false);
    expect(mockProfileUpdate).not.toHaveBeenCalled();
  });

  it("returns a failure when the candidate has no profile", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileFindUnique.mockResolvedValue(null);

    const result = await clearCandidateAvatar(USER_ID);

    expect(result.success).toBe(false);
    expect(mockDeleteS3Object).not.toHaveBeenCalled();
    expect(mockProfileUpdate).not.toHaveBeenCalled();
  });
});

describe("clearCandidateDocument", () => {
  it.each(NON_OK_STATUSES)("rejects when requireAdminSession status is %s, without touching Prisma or S3", async (status) => {
    mockRequireAdminSession.mockResolvedValue({ status } as never);

    const result = await clearCandidateDocument(USER_ID, "bankStatement");

    expect(result.success).toBe(false);
    expect(mockProfileFindUnique).not.toHaveBeenCalled();
    expect(mockProfileUpdate).not.toHaveBeenCalled();
    expect(mockDeleteS3Object).not.toHaveBeenCalled();
  });

  it("deletes the S3 object then nulls the bankStatement key + filename columns only", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileFindUnique.mockResolvedValue({
      rightToWorkDocFrontS3Key: null,
      rightToWorkDocBackS3Key: null,
      bankStatementS3Key: "candidates/user-123/step-3/bankStatement/abc.pdf",
    } as never);
    mockDeleteS3Object.mockResolvedValue(undefined);
    mockProfileUpdate.mockResolvedValue({} as never);

    const result = await clearCandidateDocument(USER_ID, "bankStatement");

    expect(result.success).toBe(true);
    expect(mockDeleteS3Object).toHaveBeenCalledWith("candidates/user-123/step-3/bankStatement/abc.pdf");
    expect(mockProfileUpdate).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { bankStatementS3Key: null, bankStatementOriginalFilename: null },
    });
  });

  it("deletes the S3 object then nulls the rightToWorkFront key + filename columns only", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileFindUnique.mockResolvedValue({
      rightToWorkDocFrontS3Key: "candidates/user-123/step-3/rightToWorkFront/abc.png",
      rightToWorkDocBackS3Key: null,
      bankStatementS3Key: null,
    } as never);
    mockDeleteS3Object.mockResolvedValue(undefined);
    mockProfileUpdate.mockResolvedValue({} as never);

    await clearCandidateDocument(USER_ID, "rightToWorkFront");

    expect(mockDeleteS3Object).toHaveBeenCalledWith("candidates/user-123/step-3/rightToWorkFront/abc.png");
    expect(mockProfileUpdate).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { rightToWorkDocFrontS3Key: null, rightToWorkDocFrontOriginalFilename: null },
    });
  });

  it("deletes the S3 object then nulls the rightToWorkBack key + filename columns only", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileFindUnique.mockResolvedValue({
      rightToWorkDocFrontS3Key: null,
      rightToWorkDocBackS3Key: "candidates/user-123/step-3/rightToWorkBack/abc.png",
      bankStatementS3Key: null,
    } as never);
    mockDeleteS3Object.mockResolvedValue(undefined);
    mockProfileUpdate.mockResolvedValue({} as never);

    await clearCandidateDocument(USER_ID, "rightToWorkBack");

    expect(mockDeleteS3Object).toHaveBeenCalledWith("candidates/user-123/step-3/rightToWorkBack/abc.png");
    expect(mockProfileUpdate).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { rightToWorkDocBackS3Key: null, rightToWorkDocBackOriginalFilename: null },
    });
  });

  it("skips the S3 call when the slot's key is already null, but still clears the DB row", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileFindUnique.mockResolvedValue({
      rightToWorkDocFrontS3Key: null,
      rightToWorkDocBackS3Key: null,
      bankStatementS3Key: null,
    } as never);
    mockProfileUpdate.mockResolvedValue({} as never);

    const result = await clearCandidateDocument(USER_ID, "bankStatement");

    expect(result.success).toBe(true);
    expect(mockDeleteS3Object).not.toHaveBeenCalled();
    expect(mockProfileUpdate).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { bankStatementS3Key: null, bankStatementOriginalFilename: null },
    });
  });

  it("does not clear the DB reference when the S3 delete fails", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileFindUnique.mockResolvedValue({
      rightToWorkDocFrontS3Key: null,
      rightToWorkDocBackS3Key: null,
      bankStatementS3Key: "candidates/user-123/step-3/bankStatement/abc.pdf",
    } as never);
    mockDeleteS3Object.mockRejectedValue(new Error("AccessDenied"));

    const result = await clearCandidateDocument(USER_ID, "bankStatement");

    expect(result.success).toBe(false);
    expect(mockProfileUpdate).not.toHaveBeenCalled();
  });

  it("returns a failure when the candidate has no profile", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER } as never);
    mockProfileFindUnique.mockResolvedValue(null);

    const result = await clearCandidateDocument(USER_ID, "bankStatement");

    expect(result.success).toBe(false);
    expect(mockDeleteS3Object).not.toHaveBeenCalled();
    expect(mockProfileUpdate).not.toHaveBeenCalled();
  });
});
