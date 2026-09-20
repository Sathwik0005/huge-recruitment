import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { requireAdminSession } from "@/lib/require-admin-session";
import { prisma } from "@/lib/prisma";
import { getS3Client, getS3Bucket } from "@/lib/s3";
import {
  ALLOWED_AVATAR_CONTENT_TYPES,
  MAX_AVATAR_SIZE_BYTES,
  isAllowedAvatarContentType,
  buildAvatarKey,
  matchesImageMagicBytes,
  getSignedAvatarUrl,
} from "@/lib/candidate-avatar";

/**
 * Serializes an AWS SDK v3 error into a plain object for server-side logging
 * only — mirrors `src/app/api/candidate/profile/avatar/route.ts`'s helper.
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
 * Admin-only replacement for a candidate's profile photo. Identical
 * validation/upload pipeline to the candidate-facing avatar route, but the
 * target `userId` comes from the route param (an admin acting on another
 * user's record), never from the caller's own session.
 */
export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await requireAdminSession();
  if (session.status !== "ok") {
    return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
  }

  const { userId } = await params;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("avatar");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No photo was provided." }, { status: 400 });
  }

  if (!isAllowedAvatarContentType(file.type)) {
    return NextResponse.json(
      { error: `Photo must be one of: ${ALLOWED_AVATAR_CONTENT_TYPES.join(", ")}.` },
      { status: 400 },
    );
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return NextResponse.json({ error: "Photo must be 5MB or smaller." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesImageMagicBytes(buffer, file.type)) {
    return NextResponse.json({ error: "The uploaded file doesn't look like a valid image." }, { status: 400 });
  }

  let client;
  let bucket;
  try {
    client = getS3Client();
    bucket = getS3Bucket();
  } catch (error) {
    console.error("[admin-avatar-upload] getS3Client()/getS3Bucket() threw (env not configured)", describeAwsError(error));
    return NextResponse.json({ error: "Photo upload isn't available in this environment." }, { status: 503 });
  }

  const key = buildAvatarKey(userId, file.type);

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
    console.error("[admin-avatar-upload] PutObjectCommand failed", describeAwsError(error));
    return NextResponse.json({ error: "Could not upload the photo. Please try again." }, { status: 502 });
  }

  const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!profile) {
    return NextResponse.json({ error: "This candidate has no profile to update." }, { status: 404 });
  }

  await prisma.candidateProfile.update({
    where: { userId },
    data: { avatarS3Key: key },
  });

  const avatarUrl = await getSignedAvatarUrl(key);
  return NextResponse.json({ avatarS3Key: key, avatarUrl });
}
