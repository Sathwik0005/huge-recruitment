import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import { formatJobLocation, formatJobPay, formatEmploymentType } from "@/lib/job-formatters";
import { isJobPubliclyVisible } from "@/lib/job-status";
import { JobStatusActions } from "./JobStatusActions";

type AdminJobRow = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "PAUSED" | "CLOSED" | "ARCHIVED";
  employmentType: string;
  townOrCity: string;
  countyOrRegion: string | null;
  postcode: string | null;
  publishedAt: Date | null;
  startDate: Date | null;
  closingDate: Date | null;
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

export function JobCardGrid({ jobs, now = new Date() }: { jobs: AdminJobRow[]; now?: Date }) {
  if (jobs.length === 0) {
    return (
      <p className="text-body-md text-on-surface-variant rounded-lg border border-outline-variant p-8 text-center">
        No jobs match these filters.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {jobs.map((job) => {
        const expired = job.status === "PUBLISHED" && !isJobPubliclyVisible(job, now);
        return (
          <article key={job.id} className="rounded-xl border border-outline-variant bg-surface p-5 flex flex-col gap-4">
            <div className="flex justify-between items-start gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-block rounded-full px-3 py-1 text-label-sm font-bold uppercase tracking-wide ${STATUS_STYLES[job.status]}`}>
                    {job.status}
                  </span>
                  {expired && (
                    <span className="inline-block rounded-full px-3 py-1 text-label-sm font-bold uppercase tracking-wide bg-status-warning/10 text-status-warning border border-status-warning/30">
                      Expired
                    </span>
                  )}
                </div>
                <h3 className="text-headline-md text-[18px] leading-snug font-semibold text-on-surface mt-2">
                  <Link href={`/admin/jobs/${job.id}/edit`} className="hover:text-primary transition-colors">
                    {job.title}
                  </Link>
                </h3>
                <p className="text-label-sm text-on-surface-variant mt-1">
                  {job.sector.label} · {formatJobLocation(job)} · {formatEmploymentType(job.employmentType)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-3 bg-surface-container-low rounded-lg border border-outline-variant/50">
              <div>
                <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Pay</p>
                <p className="text-label-md text-on-surface font-bold">{formatJobPay(job)}</p>
              </div>
              <div>
                <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Applicants</p>
                <p className="text-label-md text-primary font-bold">{job._count.applications}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-3 mt-auto">
              <div className="flex gap-3">
                <Link href={`/admin/jobs/${job.id}/edit`} className="text-label-sm text-primary font-bold hover:underline">
                  Edit
                </Link>
                <Link href={`/admin/jobs/${job.id}/preview`} className="text-label-sm text-primary font-bold hover:underline">
                  Preview
                </Link>
              </div>
              <JobStatusActions jobId={job.id} status={job.status} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
