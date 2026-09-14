import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { requireAdminSession } from "@/lib/require-admin-session";
import { getS3Client, getS3Bucket, CANDIDATE_DOCUMENTS_PREFIX } from "@/lib/s3";

/**
 * Internal, admin-only connectivity check for the S3 connection wired up in
 * src/lib/s3.ts. Confirms the Vercel-OIDC-assumed role can actually
 * PutObject/GetObject against the intended bucket/prefix — nothing more.
 *
 * Deliberately does not use HeadBucket/ListBucket/ListObjects: the current
 * IAM policy only grants s3:PutObject/s3:GetObject on `candidates/*`, not
 * s3:ListBucket, so this writes a tiny throwaway object under a clearly
 * labelled system-test subprefix and reads that exact key back instead.
 *
 * DeleteObject is not requested here because the IAM policy does not grant
 * s3:DeleteObject — the test object is left in place under
 * `candidates/_system-test/` rather than silently failing a cleanup step or
 * having permissions broadened for this diagnostic route.
 */
export async function GET() {
  const session = await requireAdminSession();
  if (session.status !== "ok") {
    return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
  }

  const testId = randomUUID();
  const key = `${CANDIDATE_DOCUMENTS_PREFIX}_system-test/${testId}.txt`;
  const expectedBody = `huge-recruitment s3 connectivity test ${testId}`;

  try {
    const client = getS3Client();
    const bucket = getS3Bucket();

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: expectedBody,
        ContentType: "text/plain",
      }),
    );

    const getResult = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const actualBody = await getResult.Body?.transformToString();

    if (actualBody !== expectedBody) {
      console.error("S3 connectivity test: round-tripped object body did not match", { key });
      return NextResponse.json({ ok: false, error: "Round-tripped object did not match." }, { status: 502 });
    }

    return NextResponse.json({ ok: true, key });
  } catch (error) {
    console.error("S3 connectivity test failed", {
      errorClass: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: "S3 connectivity test failed." }, { status: 502 });
  }
}
