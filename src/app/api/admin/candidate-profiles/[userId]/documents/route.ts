import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { requireAdminSession } from "@/lib/require-admin-session";
import { prisma } from "@/lib/prisma";
import { getS3Client, getS3Bucket } from "@/lib/s3";
import {
  DOCUMENT_SLOTS,
  type DocumentSlot,
  MAX_DOCUMENT_SIZE_BYTES,
  isAllowedDocumentContentType,
  buildDocumentKey,
  matchesDocumentMagicBytes,
} from "@/lib/candidate-documents";

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
 * Admin-only replacement for one of a candidate's Step 3 documents
 * (right-to-work front/back, bank statement). Identical validation/upload
 * pipeline to `src/app/api/candidate/profile/step-3/documents/route.ts`, but
 * the target `userId` comes from the route param, never the caller's session.
 */
export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await requireAdminSession();
  if (session.status !== "ok") {
    return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
  }

  const { userId } = await params;

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
    console.error("[admin-document-upload] getS3Client()/getS3Bucket() threw (env not configured)", describeAwsError(error));
    return NextResponse.json({ error: "Document upload isn't available in this environment." }, { status: 503 });
  }

  const key = buildDocumentKey(userId, slot, file.type as Parameters<typeof buildDocumentKey>[2]);

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
    console.error("[admin-document-upload] PutObjectCommand failed", describeAwsError(error));
    return NextResponse.json({ error: "Could not upload the file. Please try again." }, { status: 502 });
  }

  const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!profile) {
    return NextResponse.json({ error: "This candidate has no profile to update." }, { status: 404 });
  }

  const data = buildSlotData(slot, key, file.name);
  await prisma.candidateProfile.update({ where: { userId }, data });

  return NextResponse.json({ s3Key: key, originalFilename: file.name, slot });
}
