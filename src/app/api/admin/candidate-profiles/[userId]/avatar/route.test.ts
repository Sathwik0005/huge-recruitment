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

vi.mock("@/lib/candidate-avatar", async () => {
  const actual = await vi.importActual<typeof import("@/lib/candidate-avatar")>("@/lib/candidate-avatar");
  return {
    ...actual,
    getSignedAvatarUrl: vi.fn().mockResolvedValue("https://signed.example/avatar.png"),
  };
});

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

function pngFile(size = PNG_BYTES.length) {
  const bytes = new Uint8Array(Math.max(size, PNG_BYTES.length));
  bytes.set(PNG_BYTES);
  return new File([bytes], "avatar.png", { type: "image/png" });
}

function request(file?: File, extraFields?: Record<string, string>) {
  const formData = new FormData();
  if (file) formData.set("avatar", file);
  if (extraFields) {
    for (const [key, value] of Object.entries(extraFields)) formData.set(key, value);
  }
  return new Request(`http://localhost/api/admin/candidate-profiles/${TARGET_USER_ID}/avatar`, {
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

describe("POST /api/admin/candidate-profiles/[userId]/avatar", () => {
  it.each(["unauthenticated", "unverified", "no-db-user", "forbidden"] as const)(
    "returns 403 when requireAdminSession status is %s, without touching S3 or Prisma",
    async (status) => {
      mockRequireAdminSession.mockResolvedValue({ status } as never);

      const response = await POST(request(pngFile()), params());

      expect(response.status).toBe(403);
      expect(mockSend).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    },
  );

  it("rejects a missing file", async () => {
    const response = await POST(request(), params());
    expect(response.status).toBe(400);
  });

  it("rejects a disallowed content type", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "avatar.gif", { type: "image/gif" });
    const response = await POST(request(file), params());
    expect(response.status).toBe(400);
  });

  it("rejects an oversized file", async () => {
    const file = pngFile(6 * 1024 * 1024);
    const response = await POST(request(file), params());
    expect(response.status).toBe(400);
  });

  it("rejects a file whose content doesn't match its declared content type (magic-byte mismatch)", async () => {
    const file = new File([new Uint8Array(20)], "avatar.png", { type: "image/png" });
    const response = await POST(request(file), params());
    expect(response.status).toBe(400);
  });

  it("returns 503 when S3 credentials are unavailable", async () => {
    mockGetS3Client.mockImplementation(() => {
      throw new Error("AWS_ROLE_ARN is not set.");
    });
    const response = await POST(request(pngFile()), params());
    expect(response.status).toBe(503);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 502 when the S3 upload itself fails", async () => {
    mockSend.mockRejectedValue(new Error("network error"));
    const response = await POST(request(pngFile()), params());
    expect(response.status).toBe(502);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the target candidate has no profile", async () => {
    mockFindUnique.mockResolvedValue(null);
    const response = await POST(request(pngFile()), params());
    expect(response.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("uploads to S3 and persists the key against the userId taken from the route param, ignoring any client-supplied identity", async () => {
    // Even though nothing in the multipart body claims to be a different user,
    // this asserts the mutation target is derived solely from the route param.
    const response = await POST(request(pngFile(), { userId: "someone-else" }), params(TARGET_USER_ID));

    expect(response.status).toBe(200);
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { userId: TARGET_USER_ID } });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { userId: TARGET_USER_ID },
      data: { avatarS3Key: expect.stringMatching(new RegExp(`^candidates/${TARGET_USER_ID}/avatar/`)) },
    });
    const body = await response.json();
    expect(body.avatarUrl).toBe("https://signed.example/avatar.png");
  });

  it("scopes the upload to a different userId route param independently", async () => {
    await POST(request(pngFile()), params("another-candidate"));

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { userId: "another-candidate" } });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { userId: "another-candidate" },
      data: { avatarS3Key: expect.stringMatching(/^candidates\/another-candidate\/avatar\//) },
    });
  });
});
