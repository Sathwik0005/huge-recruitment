import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { ALLOWED_CV_CONTENT_TYPES, MAX_CV_SIZE_BYTES, CV_PATHNAME_PREFIX } from "@/lib/blob";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

/**
 * Issues a scoped Vercel Blob client-upload token. This is the token-issuance
 * boundary of CV upload's defense-in-depth: it enforces the declared content
 * type/size allowlist before minting a token bound to this single upload
 * (never a general-purpose token). The authoritative post-upload check —
 * fetching the real bytes and verifying the magic-byte signature — happens
 * synchronously in POST /api/applications, since Vercel's `onUploadCompleted`
 * webhook requires a public URL and doesn't fire reliably in local dev.
 */
export async function POST(request: Request) {
  const identifier = getClientIdentifier(request);
  const allowed = await checkRateLimit("cvUpload", identifier);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(CV_PATHNAME_PREFIX)) {
          throw new Error("Invalid upload destination.");
        }
        return {
          allowedContentTypes: [...ALLOWED_CV_CONTENT_TYPES],
          maximumSizeInBytes: MAX_CV_SIZE_BYTES,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch {
    return NextResponse.json({ error: "Could not process the CV upload. Please try again." }, { status: 400 });
  }
}
