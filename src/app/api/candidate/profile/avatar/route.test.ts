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

vi.mock("@/lib/candidate-avatar", async () => {
  const actual = await vi.importActual<typeof import("@/lib/candidate-avatar")>("@/lib/candidate-avatar");
  return {
    ...actual,
    getSignedAvatarUrl: vi.fn().mockResolvedValue("https://signed.example/avatar.png"),
  };
});

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

function pngFile(size = PNG_BYTES.length) {
  const bytes = new Uint8Array(Math.max(size, PNG_BYTES.length));
  bytes.set(PNG_BYTES);
  return new File([bytes], "avatar.png", { type: "image/png" });
}

function request(file?: File) {
  const formData = new FormData();
  if (file) formData.set("avatar", file);
  return new Request("http://localhost/api/candidate/profile/avatar", {
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

describe("POST /api/candidate/profile/avatar", () => {
  it("rejects when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue(false);
    const response = await POST(request(pngFile()));
    expect(response.status).toBe(429);
  });

  it("rejects when not verified", async () => {
    mockRequireVerifiedSession.mockResolvedValue({ status: "unauthenticated" });
    const response = await POST(request(pngFile()));
    expect(response.status).toBe(401);
  });

  it("rejects a missing file", async () => {
    const response = await POST(request());
    expect(response.status).toBe(400);
  });

  it("rejects a disallowed content type", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "avatar.gif", { type: "image/gif" });
    const response = await POST(request(file));
    expect(response.status).toBe(400);
  });

  it("rejects an oversized file", async () => {
    const file = pngFile(6 * 1024 * 1024);
    const response = await POST(request(file));
    expect(response.status).toBe(400);
  });

  it("rejects a file whose content doesn't match its declared type", async () => {
    const file = new File([new Uint8Array(20)], "avatar.png", { type: "image/png" });
    const response = await POST(request(file));
    expect(response.status).toBe(400);
  });

  it("returns 503 when S3 credentials are unavailable", async () => {
    mockGetS3Client.mockImplementation(() => {
      throw new Error("AWS_ROLE_ARN is not set.");
    });
    const response = await POST(request(pngFile()));
    expect(response.status).toBe(503);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("uploads to S3 and persists the key on success", async () => {
    const response = await POST(request(pngFile()));
    expect(response.status).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const body = await response.json();
    expect(body.avatarUrl).toBe("https://signed.example/avatar.png");
    expect(body.avatarS3Key).toMatch(/^candidates\/user-1\/avatar\//);
  });

  it("returns 502 when the S3 upload itself fails", async () => {
    mockSend.mockRejectedValue(new Error("network error"));
    const response = await POST(request(pngFile()));
    expect(response.status).toBe(502);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
