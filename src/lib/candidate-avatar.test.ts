import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/s3", () => ({
  getS3Client: vi.fn(),
  getS3Bucket: vi.fn(),
  CANDIDATE_DOCUMENTS_PREFIX: "candidates/",
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

import { getS3Client, getS3Bucket } from "@/lib/s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  buildAvatarKey,
  isAllowedAvatarContentType,
  matchesImageMagicBytes,
  getSignedAvatarUrl,
} from "./candidate-avatar";

const mockGetS3Client = vi.mocked(getS3Client);
const mockGetS3Bucket = vi.mocked(getS3Bucket);
const mockGetSignedUrl = vi.mocked(getSignedUrl);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isAllowedAvatarContentType", () => {
  it("accepts png, jpeg, and webp", () => {
    expect(isAllowedAvatarContentType("image/png")).toBe(true);
    expect(isAllowedAvatarContentType("image/jpeg")).toBe(true);
    expect(isAllowedAvatarContentType("image/webp")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isAllowedAvatarContentType("image/gif")).toBe(false);
    expect(isAllowedAvatarContentType("application/pdf")).toBe(false);
  });
});

describe("buildAvatarKey", () => {
  it("scopes the key under candidates/{userId}/avatar/ with the right extension", () => {
    const key = buildAvatarKey("user-1", "image/png");
    expect(key).toMatch(/^candidates\/user-1\/avatar\/[0-9a-f-]+\.png$/);
  });

  it("maps content types to extensions correctly", () => {
    expect(buildAvatarKey("u", "image/jpeg")).toMatch(/\.jpg$/);
    expect(buildAvatarKey("u", "image/webp")).toMatch(/\.webp$/);
  });
});

describe("matchesImageMagicBytes", () => {
  it("accepts a valid PNG signature", () => {
    const buffer = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(8),
    ]);
    expect(matchesImageMagicBytes(buffer, "image/png")).toBe(true);
  });

  it("accepts a valid JPEG signature", () => {
    const buffer = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(9)]);
    expect(matchesImageMagicBytes(buffer, "image/jpeg")).toBe(true);
  });

  it("accepts a valid WebP signature", () => {
    const buffer = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.alloc(4),
      Buffer.from("WEBP", "ascii"),
      Buffer.alloc(4),
    ]);
    expect(matchesImageMagicBytes(buffer, "image/webp")).toBe(true);
  });

  it("rejects a mismatched signature (spoofed content-type)", () => {
    const buffer = Buffer.alloc(16);
    expect(matchesImageMagicBytes(buffer, "image/png")).toBe(false);
    expect(matchesImageMagicBytes(buffer, "image/jpeg")).toBe(false);
    expect(matchesImageMagicBytes(buffer, "image/webp")).toBe(false);
  });

  it("rejects a too-short buffer", () => {
    expect(matchesImageMagicBytes(Buffer.alloc(4), "image/png")).toBe(false);
  });
});

describe("getSignedAvatarUrl", () => {
  it("requests a signed GetObject URL with a 5 minute TTL", async () => {
    mockGetS3Client.mockReturnValue({} as never);
    mockGetS3Bucket.mockReturnValue("test-bucket");
    mockGetSignedUrl.mockResolvedValue("https://signed.example/key");

    const url = await getSignedAvatarUrl("candidates/user-1/avatar/x.png");

    expect(url).toBe("https://signed.example/key");
    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ input: expect.objectContaining({ Bucket: "test-bucket", Key: "candidates/user-1/avatar/x.png" }) }),
      { expiresIn: 300 },
    );
  });
});
