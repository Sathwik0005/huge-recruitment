"use client";

import Link from "next/link";

export default function GlobalPageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-container-max flex-col items-center justify-center px-margin-mobile text-center md:px-margin-desktop">
      <h1 className="mb-3 font-headline-lg text-headline-lg text-primary">Something went wrong</h1>
      <p className="mb-6 max-w-md text-body-md text-on-surface-variant">
        We couldn&rsquo;t load this page. Please try again, or head back to the homepage.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-11 items-center rounded-lg bg-primary px-6 font-semibold text-on-primary transition hover:bg-primary-container"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-lg border border-primary px-6 font-semibold text-primary transition hover:bg-primary/5"
        >
          Back to homepage
        </Link>
      </div>
    </main>
  );
}
