// @vitest-environment node
//
// jsdom's Request/FormData/File globals don't correctly round-trip a real
// multipart body through `Request#formData()` (a known jsdom/undici gap),
// which hangs indefinitely rather than throwing — so this file needs Node's
// native implementations instead of the project-wide jsdom environment.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/require-admin-session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    candidateProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockSend = vi.fn();
vi.mock("@/lib/s3", () => ({
  getS3Client: vi.fn(() => ({ send: mockSend })),
  getS3Bucket: vi.fn(() => "test-bucket"),
  CANDIDATE_DOCUMENTS_PREFIX: "candidates/",
}));

import { requireAdminSession } from "@/lib/require-admin-session";
import { prisma } from "@/lib/prisma";
import { getS3Client, getS3Bucket } from "@/lib/s3";
import { POST } from "./route";

const mockRequireAdminSession = vi.mocked(requireAdminSession);
const mockFindUnique = vi.mocked(prisma.candidateProfile.findUnique);
const mockUpdate = vi.mocked(prisma.candidateProfile.update);
const mockGetS3Client = vi.mocked(getS3Client);
const mockGetS3Bucket = vi.mocked(getS3Bucket);

const ADMIN_USER = { id: "admin-1", role: "ADMIN", status: "ACTIVE" } as never;
const TARGET_USER_ID = "candidate-999";

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const PDF_BYTES = new TextEncoder().encode("%PDF-1.4\n%%rest");

function pngFile(size = PNG_BYTES.length) {
  const bytes = new Uint8Array(Math.max(size, PNG_BYTES.length));
  bytes.set(PNG_BYTES);
  return new File([bytes], "doc.png", { type: "image/png" });
}

function pdfFile() {
  return new File([PDF_BYTES], "statement.pdf", { type: "application/pdf" });
}

function request(slot?: string, file?: File, extraFields?: Record<string, string>) {
  const formData = new FormData();
  if (slot !== undefined) formData.set("slot", slot);
  if (file) formData.set("file", file);
  if (extraFields) {
    for (const [key, value] of Object.entries(extraFields)) formData.set(key, value);
  }
  return new Request(`http://localhost/api/admin/candidate-profiles/${TARGET_USER_ID}/documents`, {
    method: "POST",
    body: formData,
  });
}

function params(userId: string = TARGET_USER_ID) {
  return { params: Promise.resolve({ userId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdminSession.mockResolvedValue({ status: "ok", user: ADMIN_USER });
  mockFindUnique.mockResolvedValue({ userId: TARGET_USER_ID } as never);
  mockUpdate.mockResolvedValue({} as never);
  mockSend.mockResolvedValue({});
  mockGetS3Client.mockReturnValue({ send: mockSend } as never);
  mockGetS3Bucket.mockReturnValue("test-bucket");
});

describe("POST /api/admin/candidate-profiles/[userId]/documents", () => {
  it.each(["unauthenticated", "unverified", "no-db-user", "forbidden"] as const)(
    "returns 403 when requireAdminSession status is %s, without touching S3 or Prisma",
    async (status) => {
      mockRequireAdminSession.mockResolvedValue({ status } as never);

      const response = await POST(request("rightToWorkFront", pngFile()), params());

      expect(response.status).toBe(403);
      expect(mockSend).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    },
  );

  it("rejects an invalid slot", async () => {
    const response = await POST(request("notASlot", pngFile()), params());
    expect(response.status).toBe(400);
  });

  it("rejects a missing file", async () => {
    const response = await POST(request("rightToWorkFront"), params());
    expect(response.status).toBe(400);
  });

  it("rejects an image for the bankStatement slot (pdf-only), matching the candidate-facing route's rule", async () => {
    const response = await POST(request("bankStatement", pngFile()), params());
    expect(response.status).toBe(400);
  });

  it("accepts a PDF for the bankStatement slot", async () => {
    const response = await POST(request("bankStatement", pdfFile()), params());
    expect(response.status).toBe(200);
  });

  it("rejects an oversized file", async () => {
    const file = pngFile(11 * 1024 * 1024);
    const response = await POST(request("rightToWorkFront", file), params());
    expect(response.status).toBe(400);
  });

  it("rejects a file whose content doesn't match its declared content type (magic-byte mismatch)", async () => {
    const file = new File([new Uint8Array(20)], "doc.png", { type: "image/png" });
    const response = await POST(request("rightToWorkFront", file), params());
    expect(response.status).toBe(400);
  });

  it("returns 503 when S3 credentials are unavailable", async () => {
    mockGetS3Client.mockImplementation(() => {
      throw new Error("AWS_ROLE_ARN is not set.");
    });
    const response = await POST(request("rightToWorkFront", pngFile()), params());
    expect(response.status).toBe(503);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 502 when the S3 upload itself fails", async () => {
    mockSend.mockRejectedValue(new Error("network error"));
    const response = await POST(request("rightToWorkFront", pngFile()), params());
    expect(response.status).toBe(502);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the target candidate has no profile", async () => {
    mockFindUnique.mockResolvedValue(null);
    const response = await POST(request("rightToWorkFront", pngFile()), params());
    expect(response.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("uploads rightToWorkFront and persists the correct column pair, scoped to the route param userId", async () => {
    const response = await POST(request("rightToWorkFront", pngFile(), { userId: "someone-else" }), params());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.slot).toBe("rightToWorkFront");
    expect(body.s3Key).toMatch(new RegExp(`^candidates/${TARGET_USER_ID}/step-3/rightToWorkFront/`));
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { userId: TARGET_USER_ID },
      data: {
        rightToWorkDocFrontS3Key: body.s3Key,
        rightToWorkDocFrontOriginalFilename: "doc.png",
      },
    });
  });

  it("uploads rightToWorkBack and persists the correct column pair", async () => {
    const response = await POST(request("rightToWorkBack", pngFile()), params());
    expect(response.status).toBe(200);
    const args = mockUpdate.mock.calls[0][0];
    expect(args.where).toEqual({ userId: TARGET_USER_ID });
    expect(args.data).toHaveProperty("rightToWorkDocBackS3Key");
    expect(args.data).toHaveProperty("rightToWorkDocBackOriginalFilename", "doc.png");
  });

  it("uploads bankStatement and persists the correct column pair", async () => {
    const response = await POST(request("bankStatement", pdfFile()), params());
    expect(response.status).toBe(200);
    const args = mockUpdate.mock.calls[0][0];
    expect(args.data).toHaveProperty("bankStatementS3Key");
    expect(args.data).toHaveProperty("bankStatementOriginalFilename", "statement.pdf");
  });

  it("scopes the mutation to a different userId route param independently of any body field", async () => {
    await POST(request("bankStatement", pdfFile()), params("another-candidate"));

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { userId: "another-candidate" } });
    const args = mockUpdate.mock.calls[0][0];
    expect(args.where).toEqual({ userId: "another-candidate" });
  });
});
