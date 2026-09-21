import "server-only";
import { randomUUID } from "node:crypto";
import { CANDIDATE_DOCUMENTS_PREFIX } from "@/lib/s3";

/**
 * S3 key helper for candidate onboarding Step 4's drawn signature — a
 * single-slot sibling of `candidate-documents.ts`'s Step 3 document slots.
 * The signature is always a canvas-exported PNG, so unlike Step 3's
 * multi-content-type documents this has no slot/content-type branching.
 * Signed read URLs reuse `getSignedDocumentUrl` from `candidate-documents.ts`
 * directly, since it signs any key in the shared candidate-documents bucket.
 */

export const MAX_SIGNATURE_SIZE_BYTES = 2 * 1024 * 1024;

export function buildSignatureKey(userId: string): string {
  return `${CANDIDATE_DOCUMENTS_PREFIX}${userId}/step-4/signature/${randomUUID()}.png`;
}
