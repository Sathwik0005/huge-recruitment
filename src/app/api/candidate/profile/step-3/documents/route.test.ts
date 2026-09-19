// @vitest-environment node
//
// jsdom's Request/FormData/File globals don't correctly round-trip a real
// multipart body through `Request#formData()` (a known jsdom/undici gap),
// which hangs indefinitely rather than throwing — so this file needs Node's
// native implementations instead of the project-wide jsdom environment.
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

const mockSend = vi.fn();
vi.mock("@/lib/s3", () => ({
  getS3Client: vi.fn(() => ({ send: mockSend })),
  getS3Bucket: vi.fn(() => "test-bucket"),
  CANDIDATE_DOCUMENTS_PREFIX: "candidates/",
}));

import { checkRateLimit } from "@/lib/rate-limit";
import { requireVerifiedSession } from "@/lib/require-verified-session";
import { prisma } from "@/lib/prisma";
import { getS3Client, getS3Bucket } from "@/lib/s3";
import { POST } from "./route";

const mockCheckRateLimit = vi.mocked(checkRateLimit);
const mockRequireVerifiedSession = vi.mocked(requireVerifiedSession);
const mockUpsert = vi.mocked(prisma.candidateProfile.upsert);
const mockGetS3Client = vi.mocked(getS3Client);
const mockGetS3Bucket = vi.mocked(getS3Bucket);

const verifiedUser = { id: "user-1" } as never;

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

function request(slot?: string, file?: File) {
  const formData = new FormData();
  if (slot !== undefined) formData.set("slot", slot);
  if (file) formData.set("file", file);
  return new Request("http://localhost/api/candidate/profile/step-3/documents", {
    method: "POST",
    body: formData,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue(true);
  mockRequireVerifiedSession.mockResolvedValue({ status: "ok", user: verifiedUser });
  mockUpsert.mockResolvedValue({} as never);
  mockSend.mockResolvedValue({});
  mockGetS3Client.mockReturnValue({ send: mockSend } as never);
  mockGetS3Bucket.mockReturnValue("test-bucket");
});

describe("POST /api/candidate/profile/step-3/documents", () => {
  it("rejects when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue(false);
    const response = await POST(request("rightToWorkFront", pngFile()));
    expect(response.status).toBe(429);
  });

  it("rejects when not verified", async () => {
    mockRequireVerifiedSession.mockResolvedValue({ status: "unauthenticated" });
    const response = await POST(request("rightToWorkFront", pngFile()));
    expect(response.status).toBe(401);
  });

  it("rejects an invalid slot", async () => {
    const response = await POST(request("notASlot", pngFile()));
    expect(response.status).toBe(400);
  });

  it("rejects a missing file", async () => {
    const response = await POST(request("rightToWorkFront"));
    expect(response.status).toBe(400);
  });

  it("rejects an image for the bankStatement slot (pdf-only)", async () => {
    const response = await POST(request("bankStatement", pngFile()));
    expect(response.status).toBe(400);
  });

  it("accepts a PDF for the bankStatement slot", async () => {
    const response = await POST(request("bankStatement", pdfFile()));
    expect(response.status).toBe(200);
  });

  it("rejects an oversized file", async () => {
    const file = pngFile(11 * 1024 * 1024);
    const response = await POST(request("rightToWorkFront", file));
    expect(response.status).toBe(400);
  });

  it("rejects a file whose content doesn't match its declared type", async () => {
    const file = new File([new Uint8Array(20)], "doc.png", { type: "image/png" });
    const response = await POST(request("rightToWorkFront", file));
    expect(response.status).toBe(400);
  });

  it("returns 503 when S3 credentials are unavailable", async () => {
    mockGetS3Client.mockImplementation(() => {
      throw new Error("AWS_ROLE_ARN is not set.");
    });
    const response = await POST(request("rightToWorkFront", pngFile()));
    expect(response.status).toBe(503);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 502 when the S3 upload itself fails", async () => {
    mockSend.mockRejectedValue(new Error("network error"));
    const response = await POST(request("rightToWorkFront", pngFile()));
    expect(response.status).toBe(502);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("uploads rightToWorkFront and persists the correct column pair", async () => {
    const response = await POST(request("rightToWorkFront", pngFile()));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.slot).toBe("rightToWorkFront");
    expect(body.s3Key).toMatch(/^candidates\/user-1\/step-3\/rightToWorkFront\//);
    const args = mockUpsert.mock.calls[0][0];
    expect(args.update).toMatchObject({
      rightToWorkDocFrontS3Key: body.s3Key,
      rightToWorkDocFrontOriginalFilename: "doc.png",
    });
  });

  it("uploads rightToWorkBack and persists the correct column pair", async () => {
    const response = await POST(request("rightToWorkBack", pngFile()));
    expect(response.status).toBe(200);
    const args = mockUpsert.mock.calls[0][0];
    expect(args.update).toHaveProperty("rightToWorkDocBackS3Key");
    expect(args.update).toHaveProperty("rightToWorkDocBackOriginalFilename", "doc.png");
  });

  it("uploads bankStatement and persists the correct column pair", async () => {
    const response = await POST(request("bankStatement", pdfFile()));
    expect(response.status).toBe(200);
    const args = mockUpsert.mock.calls[0][0];
    expect(args.update).toHaveProperty("bankStatementS3Key");
    expect(args.update).toHaveProperty("bankStatementOriginalFilename", "statement.pdf");
  });
});
