import Link from "next/link";
import type { PublicJob } from "@/lib/job-dto";
import { formatJobLocation, formatJobPay, formatEmploymentType, formatRelativePostedDate, excerptFromOverview } from "@/lib/job-formatters";

export function JobCard({ job }: { job: PublicJob }) {
  const excerpt = job.shortDescription || excerptFromOverview(job.overview);

  return (
    <article className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-secondary hover:shadow-md md:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <span className="mb-2 inline-flex rounded-full bg-secondary-container px-3 py-1 text-label-sm font-bold uppercase tracking-wide text-on-secondary-container">
              {job.sector.label}
            </span>
            <h3 className="font-headline-md text-headline-md text-primary">
              <Link href={`/jobs/${job.slug}`} className="rounded-sm hover:text-secondary focus:outline-none focus:ring-2 focus:ring-primary">
                {job.title}
              </Link>
            </h3>
          </div>
          {job.showPostedDate && job.publishedAt && (
            <span className="shrink-0 text-label-sm text-on-surface-variant">
              {formatRelativePostedDate(job.publishedAt)}
            </span>
          )}
        </div>

        <span className="flex items-start gap-1.5 text-body-md text-on-surface-variant">
          <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-secondary">
            location_on
          </span>
          {formatJobLocation(job)}
        </span>

        <p className="line-clamp-2 text-body-md leading-relaxed text-on-surface-variant">{excerpt}</p>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary-fixed px-3 text-label-sm font-semibold text-on-primary-fixed">
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              payments
            </span>
            {formatJobPay(job)}
          </span>
          <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-surface-container px-3 text-label-sm font-medium text-on-surface-variant">
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              contract
            </span>
            {formatEmploymentType(job.employmentType)}
          </span>
          {job.shifts.slice(0, 2).map((shift) => (
            <span
              key={shift.id}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-surface-container px-3 text-label-sm text-on-surface-variant"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                schedule
              </span>
              {shift.label ?? shift.category}
            </span>
          ))}
        </div>

        <div className="border-t border-surface-variant pt-4">
          <Link
            href={`/jobs/${job.slug}#apply`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-on-primary transition hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            View & Apply
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              arrow_forward
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}
