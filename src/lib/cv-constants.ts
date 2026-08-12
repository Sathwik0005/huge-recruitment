// No "server-only" guard here — this file is imported by both server code
// (src/lib/blob.ts) and the client-side upload form
// (src/app/jobs/[slug]/GuestApplicationForm.tsx), so it must stay free of
// server-only imports.

/** Every CV blob pathname must live under this prefix — enforced at both token issuance and verification. */
export const CV_PATHNAME_PREFIX = "applications/cv/";

export const MAX_CV_SIZE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_CV_CONTENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
