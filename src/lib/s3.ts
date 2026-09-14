import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { fromWebToken } from "@aws-sdk/credential-provider-web-identity";
import type { AwsCredentialIdentity } from "@aws-sdk/types";

/**
 * Reusable S3 client for authenticated candidate-onboarding documents
 * (passport, right-to-work, etc.). Entirely separate from the anonymous
 * job-application CV flow, which stays on Vercel Blob — see src/lib/blob.ts.
 *
 * Credentials come from Vercel OIDC federation: VERCEL_OIDC_TOKEN (injected
 * automatically by Vercel in the Production environment) is exchanged for
 * temporary AWS credentials via sts:AssumeRoleWithWebIdentity against
 * AWS_ROLE_ARN (HugeRecruitmentVercelS3Role). No AWS access keys or other
 * long-lived secrets are used or stored anywhere.
 *
 * Region/bucket/role/token are all read lazily, only when an S3 operation is
 * actually attempted — importing this module never throws, so it stays safe
 * to import during `next build` or local `next dev`. The IAM role's trust
 * policy is intentionally scoped to the Vercel Production environment only,
 * so local development cannot authenticate to S3; calling any exported
 * function locally without VERCEL_OIDC_TOKEN set fails with a clear error
 * rather than falling back to an unsafe or fake credential source.
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

/** Exchanges the current Vercel OIDC token for temporary AWS credentials on every call — never cached across requests, since VERCEL_OIDC_TOKEN is refreshed per invocation. */
async function getCredentials(): Promise<AwsCredentialIdentity> {
  const provider = fromWebToken({
    roleArn: requiredEnv("AWS_ROLE_ARN"),
    webIdentityToken: requiredEnv("VERCEL_OIDC_TOKEN"),
    roleSessionName: "huge-recruitment-s3",
  });
  return provider();
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
      credentials: getCredentials,
    });
  }
  return s3Client;
}
