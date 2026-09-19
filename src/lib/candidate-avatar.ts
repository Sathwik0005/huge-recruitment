import "server-only";
import { randomUUID } from "node:crypto";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Bucket, getS3Client, CANDIDATE_DOCUMENTS_PREFIX } from "@/lib/s3";

/**
 * S3 key/URL helpers for the candidate profile photo, kept separate from the
 * generic client in `src/lib/s3.ts` (mirrors the `blob.ts`/`cv-constants.ts`
 * split for the guest CV upload flow).
 */

export const ALLOWED_AVATAR_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type AllowedAvatarContentType = (typeof ALLOWED_AVATAR_CONTENT_TYPES)[number];

export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

const AVATAR_SIGNED_URL_TTL_SECONDS = 300;

const CONTENT_TYPE_EXTENSIONS: Record<AllowedAvatarContentType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function isAllowedAvatarContentType(contentType: string): contentType is AllowedAvatarContentType {
  return (ALLOWED_AVATAR_CONTENT_TYPES as readonly string[]).includes(contentType);
}

/** Builds the S3 object key for a newly uploaded avatar, scoped under the candidate-documents prefix. */
export function buildAvatarKey(userId: string, contentType: AllowedAvatarContentType): string {
  const extension = CONTENT_TYPE_EXTENSIONS[contentType];
  return `${CANDIDATE_DOCUMENTS_PREFIX}${userId}/avatar/${randomUUID()}.${extension}`;
}

/**
 * Lightweight magic-byte sniff so a spoofed `Content-Type` header can't smuggle
 * an unexpected file type past validation — same defense-in-depth spirit as
 * `blob.ts`'s `matchesCvMagicBytes()` for the guest CV flow.
 */
export function matchesImageMagicBytes(buffer: Buffer, contentType: string): boolean {
  if (buffer.length < 12) return false;

  switch (contentType) {
    case "image/png":
      return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/webp":
      return (
        buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    default:
      return false;
  }
}

/** Requests a short-lived signed GET URL for a private-bucket avatar object. */
export async function getSignedAvatarUrl(key: string): Promise<string> {
  const client = getS3Client();
  const bucket = getS3Bucket();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: AVATAR_SIGNED_URL_TTL_SECONDS,
  });
}
