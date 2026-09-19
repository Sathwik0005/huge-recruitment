import { NextResponse } from "next/server";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { requireVerifiedSession } from "@/lib/require-verified-session";
import { prisma } from "@/lib/prisma";
import { getS3Client, getS3Bucket } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  ALLOWED_AVATAR_CONTENT_TYPES,
  MAX_AVATAR_SIZE_BYTES,
  isAllowedAvatarContentType,
  buildAvatarKey,
  matchesImageMagicBytes,
  getSignedAvatarUrl,
} from "@/lib/candidate-avatar";

/**
 * Serializes an AWS SDK v3 error (or the OIDC credential-exchange error that
 * wraps it) into a plain object with every field that actually explains a
 * failure — `error.message` alone is frequently just "Access Denied" or
 * "UnknownError" with the real reason one level down in `$metadata`/`cause`.
 * Logged server-side only; never sent to the client.
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
    cause:
      err.cause instanceof Error
        ? { name: err.cause.name, message: err.cause.message }
        : err.cause,
    stack: err.stack,
  };
}

/**
 * Uploads the candidate's profile photo to S3. AWS credentials only resolve
 * in the Vercel Production environment (see src/lib/s3.ts) — this route must
 * degrade to a clear 503 in local dev rather than crashing.
 */
export async function POST(request: Request) {
  console.log("[avatar-upload] request received");

  const identifier = getClientIdentifier(request);
  const allowed = await checkRateLimit("candidateAvatarUpload", identifier);
  if (!allowed) {
    console.log("[avatar-upload] rejected: rate limited", { identifier });
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const session = await requireVerifiedSession();
  if (session.status !== "ok") {
    console.log("[avatar-upload] rejected: not authenticated", { status: session.status });
    return NextResponse.json({ error: "You must be signed in to do this." }, { status: 401 });
  }
  console.log("[avatar-upload] session ok", { userId: session.user.id });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("avatar");
  if (!file || !(file instanceof File)) {
    console.log("[avatar-upload] rejected: no file provided");
    return NextResponse.json({ error: "No photo was provided." }, { status: 400 });
  }
  console.log("[avatar-upload] file received", { name: file.name, type: file.type, size: file.size });

  if (!isAllowedAvatarContentType(file.type)) {
    console.log("[avatar-upload] rejected: disallowed content type", { type: file.type });
    return NextResponse.json(
      { error: `Photo must be one of: ${ALLOWED_AVATAR_CONTENT_TYPES.join(", ")}.` },
      { status: 400 },
    );
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    console.log("[avatar-upload] rejected: file too large", { size: file.size, max: MAX_AVATAR_SIZE_BYTES });
    return NextResponse.json({ error: "Photo must be 5MB or smaller." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesImageMagicBytes(buffer, file.type)) {
    console.log("[avatar-upload] rejected: magic bytes didn't match declared content type", { type: file.type });
    return NextResponse.json({ error: "The uploaded file doesn't look like a valid image." }, { status: 400 });
  }
  console.log("[avatar-upload] validation passed, resolving S3 client/bucket");

  let client;
  let bucket;
  try {
    client = getS3Client();
    bucket = getS3Bucket();
    console.log("[avatar-upload] S3 client/bucket resolved", { bucket });
  } catch (error) {
    console.error("[avatar-upload] getS3Client()/getS3Bucket() threw (env not configured)", describeAwsError(error));
    return NextResponse.json({ error: "Photo upload isn't available in this environment." }, { status: 503 });
  }

  const key = buildAvatarKey(session.user.id, file.type);
  console.log("[avatar-upload] sending PutObjectCommand", { key });

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      }),
    );
    console.log("[avatar-upload] PutObjectCommand succeeded", { key });
  } catch (error) {
    console.error("[avatar-upload] PutObjectCommand failed", describeAwsError(error));
    return NextResponse.json({ error: "Could not upload the photo. Please try again." }, { status: 502 });
  }

  await prisma.candidateProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, avatarS3Key: key },
    update: { avatarS3Key: key },
  });
  console.log("[avatar-upload] CandidateProfile.avatarS3Key persisted", { key });

  const avatarUrl = await getSignedAvatarUrl(key);
  console.log("[avatar-upload] signed URL generated, returning success");
  return NextResponse.json({ avatarS3Key: key, avatarUrl });
}
