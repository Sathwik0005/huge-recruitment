import { NextResponse } from "next/server";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { requireVerifiedSession } from "@/lib/require-verified-session";
import { prisma } from "@/lib/prisma";
import { getS3Client, getS3Bucket } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  DOCUMENT_SLOTS,
  type DocumentSlot,
  MAX_DOCUMENT_SIZE_BYTES,
  isAllowedDocumentContentType,
  buildDocumentKey,
  matchesDocumentMagicBytes,
} from "@/lib/candidate-documents";

/**
 * Serializes an AWS SDK v3 error (or the OIDC credential-exchange error that
 * wraps it) into a plain object with every field that actually explains a
 * failure — `error.message` alone is frequently just "Access Denied" or
 * "UnknownError" with the real reason one level down in `$metadata`/`cause`.
 * Logged server-side only; never sent to the client. Mirrors
 * `avatar/route.ts`'s helper of the same name.
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

function buildSlotData(slot: DocumentSlot, key: string, originalFilename: string) {
  switch (slot) {
    case "rightToWorkFront":
      return { rightToWorkDocFrontS3Key: key, rightToWorkDocFrontOriginalFilename: originalFilename };
    case "rightToWorkBack":
      return { rightToWorkDocBackS3Key: key, rightToWorkDocBackOriginalFilename: originalFilename };
    case "bankStatement":
      return { bankStatementS3Key: key, bankStatementOriginalFilename: originalFilename };
  }
}

/**
 * Uploads one of Step 3's three documents (right-to-work front/back, bank
 * statement) to S3. AWS credentials only resolve in the Vercel Production
 * environment (see src/lib/s3.ts) — this route must degrade to a clear 503
 * in local dev rather than crashing.
 */
export async function POST(request: Request) {
  const identifier = getClientIdentifier(request);
  const allowed = await checkRateLimit("candidateProfileStep3Document", identifier);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const session = await requireVerifiedSession();
  if (session.status !== "ok") {
    return NextResponse.json({ error: "You must be signed in to do this." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);

  const slotValue = formData?.get("slot");
  if (typeof slotValue !== "string" || !(DOCUMENT_SLOTS as readonly string[]).includes(slotValue)) {
    return NextResponse.json({ error: "Invalid document slot." }, { status: 400 });
  }
  const slot = slotValue as DocumentSlot;

  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file was provided." }, { status: 400 });
  }

  if (!isAllowedDocumentContentType(slot, file.type)) {
    const allowedList = slot === "bankStatement" ? ".pdf" : ".jpg, .png, .pdf";
    return NextResponse.json({ error: `File must be one of: ${allowedList}.` }, { status: 400 });
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return NextResponse.json({ error: "File must be 10MB or smaller." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesDocumentMagicBytes(buffer, file.type)) {
    return NextResponse.json({ error: "The uploaded file doesn't look like a valid document." }, { status: 400 });
  }

  let client;
  let bucket;
  try {
    client = getS3Client();
    bucket = getS3Bucket();
  } catch (error) {
    console.error("[step3-document-upload] getS3Client()/getS3Bucket() threw (env not configured)", describeAwsError(error));
    return NextResponse.json({ error: "Document upload isn't available in this environment." }, { status: 503 });
  }

  const key = buildDocumentKey(session.user.id, slot, file.type as Parameters<typeof buildDocumentKey>[2]);

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
    console.error("[step3-document-upload] PutObjectCommand failed", describeAwsError(error));
    return NextResponse.json({ error: "Could not upload the file. Please try again." }, { status: 502 });
  }

  const data = buildSlotData(slot, key, file.name);
  await prisma.candidateProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });

  return NextResponse.json({ s3Key: key, originalFilename: file.name, slot });
}
