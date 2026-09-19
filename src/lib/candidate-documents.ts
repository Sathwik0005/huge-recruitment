import "server-only";
import { randomUUID } from "node:crypto";
import { CANDIDATE_DOCUMENTS_PREFIX } from "@/lib/s3";

/**
 * S3 key helpers for candidate onboarding Step 3's right-to-work and bank
 * documents — the multi-slot sibling of `src/lib/candidate-avatar.ts`.
 * Unlike the avatar, these documents are never displayed inline, so there is
 * intentionally no `getSignedDocumentUrl` export here (a future admin review
 * screen may need one; out of scope for this spec).
 */

export const DOCUMENT_SLOTS = ["rightToWorkFront", "rightToWorkBack", "bankStatement"] as const;
export type DocumentSlot = (typeof DOCUMENT_SLOTS)[number];

export const ALLOWED_DOCUMENT_CONTENT_TYPES = ["image/jpeg", "image/png", "application/pdf"] as const;
export type AllowedDocumentContentType = (typeof ALLOWED_DOCUMENT_CONTENT_TYPES)[number];

/** The bank statement is a formal proof document — PDF only, no photos accepted. */
export const BANK_STATEMENT_ALLOWED_CONTENT_TYPES = ["application/pdf"] as const;

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

const CONTENT_TYPE_EXTENSIONS: Record<AllowedDocumentContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

/** Allowed content types depend on the slot: the two right-to-work slots accept jpg/png/pdf, bankStatement is PDF-only. */
export function isAllowedDocumentContentType(slot: DocumentSlot, contentType: string): contentType is AllowedDocumentContentType {
  const allowed = slot === "bankStatement" ? BANK_STATEMENT_ALLOWED_CONTENT_TYPES : ALLOWED_DOCUMENT_CONTENT_TYPES;
  return (allowed as readonly string[]).includes(contentType);
}

/** Builds the S3 object key for a newly uploaded Step 3 document, scoped under the candidate-documents prefix. */
export function buildDocumentKey(userId: string, slot: DocumentSlot, contentType: AllowedDocumentContentType): string {
  const extension = CONTENT_TYPE_EXTENSIONS[contentType];
  return `${CANDIDATE_DOCUMENTS_PREFIX}${userId}/step-3/${slot}/${randomUUID()}.${extension}`;
}

/**
 * Lightweight magic-byte sniff so a spoofed `Content-Type` header can't smuggle
 * an unexpected file type past validation — same defense-in-depth spirit as
 * `candidate-avatar.ts`'s `matchesImageMagicBytes()`, extended with a PDF case.
 */
export function matchesDocumentMagicBytes(buffer: Buffer, contentType: string): boolean {
  if (buffer.length < 4) return false;

  switch (contentType) {
    case "image/png":
      return (
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      );
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "application/pdf":
      return buffer.subarray(0, 4).toString("ascii") === "%PDF";
    default:
      return false;
  }
}
