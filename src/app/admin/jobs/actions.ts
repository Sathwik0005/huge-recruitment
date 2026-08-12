"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin-session";
import { generateJobSlug } from "@/lib/job-slug";
import { isValidJobStatusTransition } from "@/lib/job-status";
import { jobInputSchema, jobPublishReadinessSchema, type JobInput } from "@/lib/validation/job";
import { JobStatus, PayType } from "@/generated/prisma/enums";

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

async function requireAdmin() {
  const session = await requireAdminSession();
  return session.status === "ok" ? session.user : null;
}

type ChildCollectionClient = Pick<
  typeof prisma,
  "jobPayRate" | "jobShift" | "jobResponsibility" | "jobRequirement" | "jobBenefit"
>;

/**
 * Builds the full set of a job's repeatable child-record write operations —
 * delete-and-recreate is the invariant-safe pattern for `isPrimary`, and it
 * also correctly clears any existing pay rates when `payType` switches to
 * `COMPETITIVE` (no recreate step runs). Shared by both `createJob` (via the
 * interactive `tx` client, since a fresh job has nothing to delete but the
 * shape must stay identical) and `updateJob` (via the array-style
 * `prisma.$transaction`), so the five-collection logic is never duplicated.
 */
function childCollectionWrites(client: ChildCollectionClient, jobId: string, input: JobInput) {
  return [
    client.jobPayRate.deleteMany({ where: { jobId } }),
    client.jobShift.deleteMany({ where: { jobId } }),
    client.jobResponsibility.deleteMany({ where: { jobId } }),
    client.jobRequirement.deleteMany({ where: { jobId } }),
    client.jobBenefit.deleteMany({ where: { jobId } }),
    ...(input.payType === PayType.NUMERIC && input.payRates.length > 0
      ? [
          client.jobPayRate.createMany({
            data: input.payRates.map((rate) => ({ ...rate, jobId })),
          }),
        ]
      : []),
    ...(input.shifts.length > 0
      ? [client.jobShift.createMany({ data: input.shifts.map((shift) => ({ ...shift, jobId })) })]
      : []),
    ...(input.responsibilities.length > 0
      ? [
          client.jobResponsibility.createMany({
            data: input.responsibilities.map((entry) => ({ ...entry, jobId })),
          }),
        ]
      : []),
    ...(input.requirements.length > 0
      ? [
          client.jobRequirement.createMany({
            data: input.requirements.map((entry) => ({ ...entry, jobId })),
          }),
        ]
      : []),
    ...(input.benefits.length > 0
      ? [client.jobBenefit.createMany({ data: input.benefits.map((entry) => ({ ...entry, jobId })) })]
      : []),
  ];
}

function jobScalarData(input: JobInput) {
  return {
    title: input.title,
    sectorId: input.sectorId,
    employmentType: input.employmentType,
    overview: input.overview,
    townOrCity: input.townOrCity,
    countyOrRegion: input.countyOrRegion ?? null,
    postcode: input.postcode ?? null,
    payType: input.payType,
    additionalPayInformation: input.additionalPayInformation ?? null,
    referenceCode: input.referenceCode ?? null,
    clientId: input.clientId ?? null,
    shortDescription: input.shortDescription ?? null,
    startDate: input.startDate ?? null,
    closingDate: input.closingDate ?? null,
    vacancyCount: input.vacancyCount ?? null,
    hoursPerWeek: input.hoursPerWeek ?? null,
    shiftSummary: input.shiftSummary ?? null,
    additionalInformation: input.additionalInformation ?? null,
    showPostedDate: input.showPostedDate,
    featured: input.featured,
  };
}

export async function createJob(rawInput: unknown): Promise<ActionResult<{ jobId: string }>> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "You do not have permission to perform this action." };

  const parsed = jobInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid job data." };
  }
  const input = parsed.data;

  try {
    const slug = await generateJobSlug(input.title);

    const job = await prisma.$transaction(async (tx) => {
      const created = await tx.job.create({
        data: {
          ...jobScalarData(input),
          slug,
          status: JobStatus.DRAFT,
          createdById: admin.id,
          updatedById: admin.id,
        },
      });

      // A fresh job has nothing to delete yet, but reusing the same helper
      // (rather than re-implementing the five create blocks here) keeps this
      // in lockstep with updateJob's child-collection logic.
      await Promise.all(childCollectionWrites(tx, created.id, input));

      return created;
    });

    revalidatePath("/admin/jobs");
    return { success: true, data: { jobId: job.id } };
  } catch (error) {
    console.error("Failed to create job", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function updateJob(jobId: string, rawInput: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "You do not have permission to perform this action." };

  const parsed = jobInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid job data." };
  }
  const input = parsed.data;

  try {
    const existing = await prisma.job.findUnique({ where: { id: jobId } });
    if (!existing) return { success: false, error: "Job not found." };

    const slug =
      existing.title === input.title ? existing.slug : await generateJobSlug(input.title, jobId);

    await prisma.$transaction([
      prisma.job.update({
        where: { id: jobId },
        data: { ...jobScalarData(input), slug, updatedById: admin.id },
      }),
      ...childCollectionWrites(prisma, jobId, input),
    ]);

    revalidatePath("/admin/jobs");
    revalidatePath(`/admin/jobs/${jobId}/edit`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to update job", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

async function transitionJobStatus(jobId: string, to: JobStatus): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "You do not have permission to perform this action." };

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { payRates: true },
  });
  if (!job) return { success: false, error: "Job not found." };

  if (!isValidJobStatusTransition(job.status, to)) {
    return { success: false, error: `Cannot move a job from ${job.status} to ${to}.` };
  }

  if (to === JobStatus.PUBLISHED) {
    const readiness = jobPublishReadinessSchema.safeParse({
      title: job.title,
      sectorId: job.sectorId,
      employmentType: job.employmentType,
      overview: job.overview,
      townOrCity: job.townOrCity,
      countyOrRegion: job.countyOrRegion ?? undefined,
      postcode: job.postcode ?? undefined,
      payType: job.payType,
      payRates: job.payRates.map((rate) => ({
        label: rate.label ?? undefined,
        minimum: rate.minimum,
        maximum: rate.maximum ?? undefined,
        period: rate.period,
        isPrimary: rate.isPrimary,
        displayOrder: rate.displayOrder,
      })),
      startDate: job.startDate ?? undefined,
      closingDate: job.closingDate ?? undefined,
    });
    if (!readiness.success) {
      return {
        success: false,
        error: readiness.error.issues[0]?.message ?? "This job is not ready to publish.",
      };
    }
  }

  try {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: to,
        updatedById: admin.id,
        ...(to === JobStatus.PUBLISHED && !job.publishedAt ? { publishedAt: new Date() } : {}),
        ...(to === JobStatus.CLOSED ? { closedAt: new Date() } : {}),
      },
    });
    revalidatePath("/admin/jobs");
    revalidatePath("/jobs");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to transition job status", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function publishJob(jobId: string) {
  return transitionJobStatus(jobId, JobStatus.PUBLISHED);
}
export async function pauseJob(jobId: string) {
  return transitionJobStatus(jobId, JobStatus.PAUSED);
}
export async function closeJob(jobId: string) {
  return transitionJobStatus(jobId, JobStatus.CLOSED);
}
export async function archiveJob(jobId: string) {
  return transitionJobStatus(jobId, JobStatus.ARCHIVED);
}
export async function restoreToDraft(jobId: string) {
  return transitionJobStatus(jobId, JobStatus.DRAFT);
}
