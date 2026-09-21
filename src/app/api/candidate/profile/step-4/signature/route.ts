import { NextResponse } from "next/server";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { requireVerifiedSession } from "@/lib/require-verified-session";
import { prisma } from "@/lib/prisma";
import { getS3Client, getS3Bucket } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { MAX_SIGNATURE_SIZE_BYTES, buildSignatureKey } from "@/lib/candidate-signature";
import { matchesDocumentMagicBytes } from "@/lib/candidate-documents";

/**
 * Serializes an AWS SDK v3 error the same way as the sibling Step 3 document
 * upload route — logged server-side only, never sent to the client.
 */
function describeAwsError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { errorClass: typeof error, errorValue: String(error) };
  }
  const err = error as Error & {
    name?: string;
    code?: string;
    Code?: string;
    $metadata?: unknown;
    $fault?: string;
    $response?: unknown;
    cause?: unknown;
  };
  return {
    errorClass: err.constructor.name,
    name: err.name,
    message: err.message,
    code: err.code ?? err.Code,
    fault: err.$fault,
    metadata: err.$metadata,
    cause: err.cause instanceof Error ? { name: err.cause.name, message: err.cause.message } : err.cause,
    stack: err.stack,
  };
}

/**
 * Uploads the candidate's drawn signature (a canvas-exported PNG) for
 * Step 4's Employee Declaration to S3. AWS credentials only resolve in the
 * Vercel Production environment (see src/lib/s3.ts) — this route must
 * degrade to a clear 503 in local dev rather than crashing.
 */
export async function POST(request: Request) {
  const identifier = getClientIdentifier(request);
  const allowed = await checkRateLimit("candidateProfileStep4Signature", identifier);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const session = await requireVerifiedSession();
  if (session.status !== "ok") {
    return NextResponse.json({ error: "You must be signed in to do this." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);

  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No signature was provided." }, { status: 400 });
  }

  if (file.type !== "image/png") {
    return NextResponse.json({ error: "Signature must be a PNG image." }, { status: 400 });
  }

  if (file.size > MAX_SIGNATURE_SIZE_BYTES) {
    return NextResponse.json({ error: "Signature file is too large." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesDocumentMagicBytes(buffer, file.type)) {
    return NextResponse.json({ error: "The uploaded signature doesn't look like a valid image." }, { status: 400 });
  }

  let client;
  let bucket;
  try {
    client = getS3Client();
    bucket = getS3Bucket();
  } catch (error) {
    console.error("[step4-signature-upload] getS3Client()/getS3Bucket() threw (env not configured)", describeAwsError(error));
    return NextResponse.json({ error: "Signature upload isn't available in this environment." }, { status: 503 });
  }

  const key = buildSignatureKey(session.user.id);

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      }),
    );
  } catch (error) {
    console.error("[step4-signature-upload] PutObjectCommand failed", describeAwsError(error));
    return NextResponse.json({ error: "Could not upload the signature. Please try again." }, { status: 502 });
  }

  await prisma.candidateProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, declarationSignatureS3Key: key },
    update: { declarationSignatureS3Key: key },
  });

  return NextResponse.json({ s3Key: key });
}
