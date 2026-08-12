import { JobStatus } from "@/generated/prisma/enums";

/**
 * Allowed job lifecycle transitions. `restoreToDraft` is the only path back
 * to DRAFT, and only from PAUSED/CLOSED — an ARCHIVED job can never be
 * un-archived (its slug stays reserved but the job itself is done).
 */
const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  DRAFT: [JobStatus.PUBLISHED],
  PUBLISHED: [JobStatus.PAUSED, JobStatus.CLOSED, JobStatus.ARCHIVED],
  PAUSED: [JobStatus.PUBLISHED, JobStatus.CLOSED, JobStatus.ARCHIVED, JobStatus.DRAFT],
  CLOSED: [JobStatus.ARCHIVED, JobStatus.DRAFT],
  ARCHIVED: [],
};

export function isValidJobStatusTransition(from: JobStatus, to: JobStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

type JobVisibilityInput = {
  status: JobStatus;
  startDate: Date | null;
  closingDate: Date | null;
};

/**
 * A job is publicly visible (listable, viewable, and able to accept
 * applications) only when PUBLISHED and within its optional date window.
 * `startDate` in the future or `closingDate` in the past both make it
 * invisible even though the status is still PUBLISHED.
 */
export function isJobPubliclyVisible(job: JobVisibilityInput, now: Date = new Date()): boolean {
  if (job.status !== JobStatus.PUBLISHED) return false;
  if (job.startDate && job.startDate > now) return false;
  if (job.closingDate && job.closingDate < now) return false;
  return true;
}
