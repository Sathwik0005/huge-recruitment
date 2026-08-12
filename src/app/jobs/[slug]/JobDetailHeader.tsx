import type { PublicJob } from "@/lib/job-dto";
import { formatJobLocation, formatJobPay, formatEmploymentType, formatRelativePostedDate } from "@/lib/job-formatters";

function StatChip({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/15">
      <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-secondary-fixed">
        {icon}
      </span>
      <div className="leading-tight">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">{label}</p>
        <p className="text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
}

export function JobDetailHeader({ job, isOpen }: { job: PublicJob; isOpen: boolean }) {
  return (
    <header className="relative overflow-hidden rounded-2xl bg-primary px-5 py-6 text-on-primary shadow-lg md:px-8 md:py-8">
      <div className="relative z-10 max-w-4xl">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/14 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white ring-1 ring-white/25">
            {job.sector.label}
          </span>
          {!isOpen && (
            <span className="rounded-full bg-error px-3 py-1 text-xs font-bold uppercase tracking-wider text-on-error">
              Closed
            </span>
          )}
          {job.showPostedDate && job.publishedAt && (
            <span className="text-sm text-white/80">{formatRelativePostedDate(job.publishedAt)}</span>
          )}
        </div>

        <h1 className="mb-4 max-w-3xl text-[30px] font-bold leading-9 tracking-tight text-white md:text-[42px] md:leading-[48px]">
          {job.title}
        </h1>

        <div className="flex flex-wrap gap-2">
          <StatChip icon="location_on" label="Location" value={formatJobLocation(job)} />
          <StatChip icon="payments" label="Pay" value={formatJobPay(job)} />
          <StatChip icon="contract" label="Employment" value={formatEmploymentType(job.employmentType)} />
          {job.hoursPerWeek && (
            <StatChip icon="schedule" label="Hours" value={`${job.hoursPerWeek} hrs/week`} />
          )}
        </div>
      </div>
    </header>
  );
}
