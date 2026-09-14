import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { awsCredentialsProvider } from "@vercel/functions/oidc";

/**
 * Reusable S3 client for authenticated candidate-onboarding documents
 * (passport, right-to-work, etc.). Entirely separate from the anonymous
 * job-application CV flow, which stays on Vercel Blob — see src/lib/blob.ts.
 *
 * Credentials come from Vercel's OIDC federation, via `awsCredentialsProvider`
 * (Vercel's recommended integration for this): it fetches the current
 * Vercel OIDC identity token itself and exchanges it for temporary AWS
 * credentials via sts:AssumeRoleWithWebIdentity against AWS_ROLE_ARN
 * (HugeRecruitmentVercelS3Role). No AWS access keys, and no manual reading of
 * VERCEL_OIDC_TOKEN, are used anywhere.
 *
 * Region/bucket/role are all read lazily, only when an S3 operation is
 * actually attempted — importing this module never throws, so it stays safe
 * to import during `next build` or local `next dev`. The IAM role's trust
 * policy is intentionally scoped to the Vercel Production environment only,
 * so local development cannot authenticate to S3; calling any exported
 * function locally fails with a clear error from the credential exchange
 * itself rather than falling back to an unsafe or fake credential source.
 */

/** Every candidate-document object must live under this prefix — matches the IAM policy's `candidates/*` scope. */
export const CANDIDATE_DOCUMENTS_PREFIX = "candidates/";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. AWS S3 access is only available in the Vercel Production environment configured for HugeRecruitmentVercelS3Role's trust policy — it is intentionally unavailable in local development.`,
    );
  }
  return value;
}

/** The configured candidate-documents bucket name. Throws if AWS_S3_BUCKET is unset. */
export function getS3Bucket(): string {
  return requiredEnv("AWS_S3_BUCKET");
}

let s3Client: S3Client | null = null;

/** Lazily-constructed singleton S3 client. Region and credentials are resolved per-request, not at construction time. */
export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: async () => requiredEnv("AWS_REGION"),
      credentials: awsCredentialsProvider({
        roleArn: requiredEnv("AWS_ROLE_ARN"),
        roleSessionName: "huge-recruitment-s3",
      }),
    });
  }
  return s3Client;
}
