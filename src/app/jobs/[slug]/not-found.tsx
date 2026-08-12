import Link from "next/link";

export default function JobNotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-container-max flex-col items-center justify-center px-margin-mobile text-center md:px-margin-desktop">
      <span aria-hidden="true" className="material-symbols-outlined mb-3 text-[48px] text-outline">
        search_off
      </span>
      <h1 className="mb-3 font-headline-lg text-headline-lg text-primary">Job not found</h1>
      <p className="mb-6 max-w-md text-body-md text-on-surface-variant">
        This role may have been filled, closed, or the link may be incorrect.
      </p>
      <Link
        href="/jobs"
        className="inline-flex h-11 items-center rounded-lg bg-primary px-6 font-semibold text-on-primary transition hover:bg-primary-container"
      >
        Browse all jobs
      </Link>
    </main>
  );
}
