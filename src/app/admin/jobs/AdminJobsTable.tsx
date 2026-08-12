import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import { formatJobLocation, formatJobPay } from "@/lib/job-formatters";
import { JobStatusActions } from "./JobStatusActions";

type AdminJobRow = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "PAUSED" | "CLOSED" | "ARCHIVED";
  townOrCity: string;
  countyOrRegion: string | null;
  postcode: string | null;
  publishedAt: Date | null;
  payType: "NUMERIC" | "COMPETITIVE";
  payRates: {
    minimum: Prisma.Decimal;
    maximum: Prisma.Decimal | null;
    period: "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR";
    isPrimary: boolean;
  }[];
  sector: { label: string };
  _count: { applications: number };
};

const STATUS_STYLES: Record<AdminJobRow["status"], string> = {
  DRAFT: "bg-surface-container text-on-surface-variant",
  PUBLISHED: "bg-secondary-container text-on-secondary-container",
  PAUSED: "bg-tertiary-container text-on-tertiary-container",
  CLOSED: "bg-error-container text-on-error-container",
  ARCHIVED: "bg-surface-container-high text-on-surface-variant",
};

export function AdminJobsTable({ jobs }: { jobs: AdminJobRow[] }) {
  if (jobs.length === 0) {
    return (
      <p className="text-body-md text-on-surface-variant rounded-lg border border-outline-variant p-8 text-center">
        No jobs match these filters.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <article key={job.id} className="rounded-lg border border-outline-variant bg-surface p-5 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span
                className={`inline-block rounded-full px-3 py-1 text-label-sm font-bold uppercase tracking-wide ${STATUS_STYLES[job.status]}`}
              >
                {job.status}
              </span>
              <h3 className="text-headline-md text-primary mt-2">
                <Link href={`/admin/jobs/${job.id}/edit`} className="hover:underline">
                  {job.title}
                </Link>
              </h3>
              <p className="text-body-md text-on-surface-variant">
                {job.sector.label} · {formatJobLocation(job)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-body-md font-bold text-primary">{formatJobPay(job)}</p>
              <p className="text-label-sm text-on-surface-variant">{job._count.applications} applications</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-3">
            <div className="flex gap-3">
              <Link href={`/admin/jobs/${job.id}/edit`} className="text-label-md text-primary font-bold hover:underline">
                Edit
              </Link>
              <Link
                href={`/admin/jobs/${job.id}/preview`}
                className="text-label-md text-primary font-bold hover:underline"
              >
                Preview
              </Link>
            </div>
            <JobStatusActions jobId={job.id} status={job.status} />
          </div>
        </article>
      ))}
    </div>
  );
}
