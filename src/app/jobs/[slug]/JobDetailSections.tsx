import type { ReactNode } from "react";
import type { PublicJob } from "@/lib/job-dto";
import { formatPayRate } from "@/lib/job-formatters";

function SectionCard({ children }: { children: ReactNode }) {
  return <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">{children}</section>;
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 font-headline-md text-headline-md text-primary">{children}</h2>;
}

export function OverviewSection({ job }: { job: PublicJob }) {
  return (
    <SectionCard>
      <SectionHeading>Role overview</SectionHeading>
      <p className="text-body-md leading-7 text-on-surface-variant">{job.overview}</p>
    </SectionCard>
  );
}

export function ResponsibilitiesSection({ job }: { job: PublicJob }) {
  if (job.responsibilities.length === 0) return null;
  return (
    <SectionCard>
      <SectionHeading>What you&rsquo;ll be doing</SectionHeading>
      <ul className="space-y-3">
        {job.responsibilities.map((entry) => (
          <li key={entry.text} className="flex items-start gap-3 text-on-surface-variant">
            <span aria-hidden="true" className="material-symbols-outlined mt-0.5 shrink-0 text-[19px] text-secondary">
              check_circle
            </span>
            <span className="leading-6">{entry.text}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function RequirementsSection({ job }: { job: PublicJob }) {
  if (job.requirements.length === 0) return null;
  return (
    <SectionCard>
      <SectionHeading>What we&rsquo;re looking for</SectionHeading>
      <ul className="space-y-3">
        {job.requirements.map((entry) => (
          <li key={entry.text} className="flex items-start gap-3 text-on-surface-variant">
            <span aria-hidden="true" className="material-symbols-outlined mt-0.5 shrink-0 text-[19px] text-secondary">
              person_check
            </span>
            <span className="leading-6">{entry.text}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function ShiftsSection({ job }: { job: PublicJob }) {
  if (job.shifts.length === 0) return null;
  return (
    <SectionCard>
      <SectionHeading>Shift pattern</SectionHeading>
      <div className="grid gap-2 sm:grid-cols-3">
        {job.shifts.map((shift) => (
          <article key={shift.id} className="rounded-lg border border-surface-variant bg-surface-container-low p-3">
            <h3 className="text-sm font-semibold text-primary">{shift.label ?? shift.category}</h3>
            {shift.startTime && shift.endTime && (
              <p className="text-sm font-semibold text-on-surface">
                {shift.startTime}&ndash;{shift.endTime}
              </p>
            )}
            {shift.days && <p className="mt-0.5 text-label-sm text-on-surface-variant">{shift.days}</p>}
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

export function PayDetailsSection({ job }: { job: PublicJob }) {
  if (job.payRates.length === 0) return null;
  return (
    <SectionCard>
      <SectionHeading>Pay details</SectionHeading>
      <div className="overflow-hidden rounded-lg border border-outline-variant">
        <dl className="divide-y divide-outline-variant">
          {job.payRates.map((rate) => (
            <div key={rate.id} className="flex flex-col gap-1 bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <dt className="font-medium text-on-surface-variant">{rate.label ?? "Pay rate"}</dt>
              <dd className="font-bold text-primary">{formatPayRate(rate)}</dd>
            </div>
          ))}
        </dl>
      </div>
      {job.additionalPayInformation && (
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">{job.additionalPayInformation}</p>
      )}
    </SectionCard>
  );
}

export function BenefitsSection({ job }: { job: PublicJob }) {
  if (job.benefits.length === 0) return null;
  return (
    <SectionCard>
      <SectionHeading>What&rsquo;s included</SectionHeading>
      <ul className="grid gap-2 sm:grid-cols-2">
        {job.benefits.map((entry) => (
          <li key={entry.text} className="flex min-h-12 items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-on-surface-variant">
            <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-[19px] text-secondary">
              verified
            </span>
            <span>{entry.text}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function AdditionalInformationSection({ job }: { job: PublicJob }) {
  if (!job.additionalInformation) return null;
  return (
    <SectionCard>
      <SectionHeading>Additional information</SectionHeading>
      <p className="text-body-md leading-7 text-on-surface-variant">{job.additionalInformation}</p>
    </SectionCard>
  );
}
