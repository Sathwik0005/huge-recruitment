"use client";

export default function JobsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-container-max px-margin-mobile py-16 text-center md:px-margin-desktop">
      <h1 className="mb-3 font-headline-lg text-headline-lg text-primary">Something went wrong</h1>
      <p className="mb-6 text-body-md text-on-surface-variant">
        We couldn&rsquo;t load the jobs listing. Please try again.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="h-11 rounded-lg bg-primary px-6 font-semibold text-on-primary transition hover:bg-primary-container"
      >
        Try again
      </button>
    </main>
  );
}
