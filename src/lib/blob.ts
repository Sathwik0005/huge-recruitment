import "server-only";
import { get, del } from "@vercel/blob";
import { CV_PATHNAME_PREFIX, MAX_CV_SIZE_BYTES, ALLOWED_CV_CONTENT_TYPES } from "@/lib/cv-constants";

export { CV_PATHNAME_PREFIX, MAX_CV_SIZE_BYTES, ALLOWED_CV_CONTENT_TYPES };

const MAGIC_BYTE_SIGNATURES: { contentType: (typeof ALLOWED_CV_CONTENT_TYPES)[number]; check: (bytes: Uint8Array) => boolean }[] = [
  {
    // PDF: "%PDF-"
    contentType: "application/pdf",
    check: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d,
  },
  {
    // DOCX (and modern .doc saved as OOXML): a ZIP archive, "PK\x03\x04"
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    check: (b) => b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07),
  },
  {
    // Legacy .doc (OLE Compound File): D0 CF 11 E0 A1 B1 1A E1
    contentType: "application/msword",
    check: (b) => b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0,
  },
];

/**
 * Verifies the actual file bytes match a known CV signature — defense in
 * depth against a spoofed declared MIME type/extension. Accepts any allowed
 * signature match regardless of the client's declared content type, since
 * DOCX/legacy DOC share overlapping byte patterns across viewers.
 */
export function matchesCvMagicBytes(bytes: Uint8Array): boolean {
  return MAGIC_BYTE_SIGNATURES.some((sig) => sig.check(bytes));
}

/**
 * Streams a private Blob's bytes server-side for the admin CV download route.
 * Never exposes a public/signed URL to the client — only the raw bytes and
 * metadata needed to set safe response headers are returned here.
 */
export async function getCvBlobStream(pathname: string) {
  const result = await get(pathname, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN });
  if (!result || result.statusCode !== 200) return null;
  return { stream: result.stream, contentType: result.blob.contentType, size: result.blob.size };
}

/**
 * Fetches an already-uploaded blob's actual bytes and verifies both its size
 * and magic-byte signature. This is the authoritative post-upload check —
 * `onBeforeGenerateToken`'s declared-type/size check only guards the token
 * issuance moment, so a mismatched or spoofed upload must still be caught
 * here before an application is allowed to reference it. (`onUploadCompleted`
 * webhooks require a public URL and don't fire reliably in local dev, so this
 * synchronous check in the request path is the reliable enforcement point.)
 */
export async function verifyUploadedCv(
  pathname: string
): Promise<{ ok: true; size: number; contentType: string } | { ok: false; reason: string }> {
  if (!pathname.startsWith(CV_PATHNAME_PREFIX)) {
    return { ok: false, reason: "invalid-pathname" };
  }

  const result = await get(pathname, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN });
  if (!result || result.statusCode !== 200) return { ok: false, reason: "not-found" };

  if (result.blob.size > MAX_CV_SIZE_BYTES || result.blob.size === 0) {
    return { ok: false, reason: "invalid-size" };
  }

  const bytes = new Uint8Array(await new Response(result.stream).arrayBuffer());
  if (!matchesCvMagicBytes(bytes)) {
    return { ok: false, reason: "invalid-signature" };
  }

  return { ok: true, size: result.blob.size, contentType: result.blob.contentType };
}

/** Deletes an orphaned CV blob — called when application creation fails after a successful upload. */
export async function deleteCvBlob(pathname: string): Promise<void> {
  try {
    await del(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch (error) {
    console.error("Failed to delete orphaned CV blob", error);
  }
}
