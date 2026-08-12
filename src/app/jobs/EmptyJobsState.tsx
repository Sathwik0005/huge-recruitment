import Link from "next/link";

export function EmptyJobsState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-6 py-14 text-center shadow-sm">
      <span aria-hidden="true" className="material-symbols-outlined mb-3 text-[42px] text-outline">
        work_off
      </span>
      <h3 className="mb-2 font-headline-md text-headline-md text-primary">
        {hasFilters ? "No matching jobs found" : "No jobs are currently listed"}
      </h3>
      <p className="mx-auto mb-6 max-w-md text-on-surface-variant">
        {hasFilters
          ? "Try removing one or more filters or searching another location."
          : "Check back soon — new roles are added regularly."}
      </p>
      {hasFilters && (
        <Link
          href="/jobs"
          className="inline-flex h-11 items-center rounded-lg bg-primary px-6 font-semibold text-on-primary transition hover:bg-primary-container"
        >
          Reset filters
        </Link>
      )}
    </div>
  );
}
