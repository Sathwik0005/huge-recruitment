import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isJobPubliclyVisible } from "@/lib/job-status";
import { verifyUploadedCv, deleteCvBlob } from "@/lib/blob";
import { sendAdminApplicationNotification } from "@/lib/email";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import {
  guestApplicationSchema,
  PRIVACY_POLICY_VERSION,
  DUPLICATE_SUBMISSION_WINDOW_MINUTES,
} from "@/lib/validation/application";

function generatePublicReference(): string {
  return `APP-${randomBytes(6).toString("base64url").toUpperCase()}`;
}

export async function POST(request: Request) {
  const identifier = getClientIdentifier(request);
  const allowed = await checkRateLimit("applications", identifier);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: reject silently as a generic validation error, never tipping
  // off automated submitters that this specific field was the trigger.
  if (
    typeof body === "object" &&
    body !== null &&
    "companyWebsite" in body &&
    typeof (body as { companyWebsite?: unknown }).companyWebsite === "string" &&
    (body as { companyWebsite: string }).companyWebsite.length > 0
  ) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 400 });
  }

  const parsed = guestApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid application." }, { status: 400 });
  }
  const input = parsed.data;

  // Idempotent duplicate-submission protection: same email + job within a
  // short window returns the existing reference instead of creating a new row.
  const duplicateWindowStart = new Date(Date.now() - DUPLICATE_SUBMISSION_WINDOW_MINUTES * 60_000);
  const existing = await prisma.jobApplication.findFirst({
    where: { jobId: input.jobId, email: input.email, createdAt: { gte: duplicateWindowStart } },
    select: { publicReference: true },
  });
  if (existing) {
    return NextResponse.json({ publicReference: existing.publicReference }, { status: 200 });
  }

  // Post-upload verification (magic-byte + size) — authoritative check,
  // independent of the upload token issuance boundary. The verified
  // size/contentType (not the client's self-reported values) are what get
  // persisted below.
  let verifiedCv: { size: number; contentType: string } | undefined;
  if (input.cv) {
    const verification = await verifyUploadedCv(input.cv.pathname);
    if (!verification.ok) {
      await deleteCvBlob(input.cv.pathname);
      return NextResponse.json({ error: "The uploaded CV could not be verified. Please try again." }, { status: 400 });
    }
    verifiedCv = { size: verification.size, contentType: verification.contentType };
  }

  try {
    const application = await prisma.$transaction(async (tx) => {
      // Race-condition re-check inside the same transaction as the create —
      // closes the gap where a job closes between page load and submit.
      const job = await tx.job.findUnique({
        where: { id: input.jobId },
        select: { id: true, title: true, referenceCode: true, status: true, startDate: true, closingDate: true },
      });
      if (!job || !isJobPubliclyVisible(job)) {
        throw new Error("JOB_NOT_ACCEPTING_APPLICATIONS");
      }

      const created = await tx.jobApplication.create({
        data: {
          publicReference: generatePublicReference(),
          jobId: job.id,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          location: input.location,
          privacyConsentAt: new Date(),
          privacyPolicyVersion: PRIVACY_POLICY_VERSION,
          cvBlobPathname: input.cv?.pathname,
          cvOriginalFilename: input.cv?.originalFilename,
          cvMimeType: verifiedCv?.contentType,
          cvSizeBytes: verifiedCv?.size,
          cvUploadedAt: input.cv ? new Date() : undefined,
          cvUploadState: input.cv ? "complete" : undefined,
        },
      });

      return { ...created, jobTitle: job.title, jobReferenceCode: job.referenceCode };
    });

    // Notification failure never loses the already-persisted application.
    await sendAdminApplicationNotification({
      applicationId: application.id,
      publicReference: application.publicReference,
      jobTitle: application.jobTitle,
      jobReferenceCode: application.jobReferenceCode,
      fullName: application.fullName,
      email: application.email,
      phone: application.phone,
      location: application.location,
    });

    return NextResponse.json({ publicReference: application.publicReference }, { status: 201 });
  } catch (error) {
    if (input.cv) await deleteCvBlob(input.cv.pathname);

    if (error instanceof Error && error.message === "JOB_NOT_ACCEPTING_APPLICATIONS") {
      return NextResponse.json(
        { error: "This job is no longer accepting applications." },
        { status: 409 }
      );
    }

    console.error("Failed to create job application", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
