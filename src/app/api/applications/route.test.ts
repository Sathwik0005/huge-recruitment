import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobApplication: { findFirst: vi.fn(), create: vi.fn() },
    job: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIdentifier: vi.fn().mockReturnValue("1.2.3.4"),
}));

vi.mock("@/lib/blob", () => ({
  verifyUploadedCv: vi.fn(),
  deleteCvBlob: vi.fn(),
  ALLOWED_CV_CONTENT_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  MAX_CV_SIZE_BYTES: 5 * 1024 * 1024,
}));

vi.mock("@/lib/email", () => ({
  sendAdminApplicationNotification: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyUploadedCv, deleteCvBlob } from "@/lib/blob";
import { sendAdminApplicationNotification } from "@/lib/email";
import { POST } from "./route";

const mockCheckRateLimit = vi.mocked(checkRateLimit);
const mockFindFirst = vi.mocked(prisma.jobApplication.findFirst);
const mockTransaction = vi.mocked(prisma.$transaction);
const mockJobFindUnique = vi.mocked(prisma.job.findUnique);
const mockJobApplicationCreate = vi.mocked(prisma.jobApplication.create);
const mockVerifyUploadedCv = vi.mocked(verifyUploadedCv);
const mockDeleteCvBlob = vi.mocked(deleteCvBlob);
const mockSendNotification = vi.mocked(sendAdminApplicationNotification);

const VALID_BODY = {
  jobId: "job-1",
  fullName: "Jane Doe",
  email: "jane@example.com",
  phone: "07123456789",
  location: "Foston",
  privacyConsent: true,
};

function request(body: unknown) {
  return new Request("http://localhost/api/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue(true);
  mockFindFirst.mockResolvedValue(null);
  mockTransaction.mockImplementation((async (callback: (tx: typeof prisma) => unknown) => callback(prisma)) as never);
  mockJobFindUnique.mockResolvedValue({
    id: "job-1",
    title: "Warehouse Operative",
    referenceCode: null,
    status: "PUBLISHED",
    startDate: null,
    closingDate: null,
  } as never);
  mockJobApplicationCreate.mockResolvedValue({
    id: "app-1",
    publicReference: "APP-TEST123",
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "07123456789",
    location: "Foston",
  } as never);
});

describe("POST /api/applications", () => {
  it("rejects when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue(false);
    const response = await POST(request(VALID_BODY));
    expect(response.status).toBe(429);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects invalid input", async () => {
    const response = await POST(request({ ...VALID_BODY, email: "not-an-email" }));
    expect(response.status).toBe(400);
  });

  it("silently rejects a filled honeypot without a distinguishing error", async () => {
    const response = await POST(request({ ...VALID_BODY, companyWebsite: "spam" }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Something went wrong. Please try again.");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("creates an application and returns its public reference on success", async () => {
    const response = await POST(request(VALID_BODY));
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.publicReference).toBe("APP-TEST123");
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it("rejects submission to a job that is not PUBLISHED, re-checked inside the transaction", async () => {
    mockJobFindUnique.mockResolvedValue({
      id: "job-1",
      title: "Warehouse Operative",
      referenceCode: null,
      status: "CLOSED",
      startDate: null,
      closingDate: null,
    } as never);

    const response = await POST(request(VALID_BODY));
    expect(response.status).toBe(409);
    expect(mockJobApplicationCreate).not.toHaveBeenCalled();
  });

  it("returns the existing reference instead of creating a duplicate within the time window", async () => {
    mockFindFirst.mockResolvedValue({ publicReference: "APP-EXISTING" } as never);

    const response = await POST(request(VALID_BODY));
    const data = await response.json();
    expect(data.publicReference).toBe("APP-EXISTING");
    expect(mockJobApplicationCreate).not.toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("returns a success response to the client even when the notification email fails, and the application is still persisted", async () => {
    mockSendNotification.mockRejectedValue(new Error("Resend is down"));
    await POST(request(VALID_BODY));
    // sendAdminApplicationNotification itself never throws (per its own
    // design), but if it somehow did, the create must have already happened.
    expect(mockJobApplicationCreate).toHaveBeenCalledTimes(1);
  });

  it("rejects when the uploaded CV fails verification, and deletes the orphaned blob", async () => {
    mockVerifyUploadedCv.mockResolvedValue({ ok: false, reason: "invalid-signature" });

    const response = await POST(
      request({
        ...VALID_BODY,
        cv: {
          pathname: "applications/cv/abc.pdf",
          originalFilename: "resume.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1024,
        },
      })
    );

    expect(response.status).toBe(400);
    expect(mockDeleteCvBlob).toHaveBeenCalledWith("applications/cv/abc.pdf");
    expect(mockJobApplicationCreate).not.toHaveBeenCalled();
  });

  it("links a verified CV to the created application", async () => {
    mockVerifyUploadedCv.mockResolvedValue({ ok: true, size: 1024, contentType: "application/pdf" });

    await POST(
      request({
        ...VALID_BODY,
        cv: {
          pathname: "applications/cv/abc.pdf",
          originalFilename: "resume.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1024,
        },
      })
    );

    expect(mockJobApplicationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cvBlobPathname: "applications/cv/abc.pdf" }),
      })
    );
  });
});
