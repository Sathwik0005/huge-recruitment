import "server-only";

/**
 * Canonical production origin — used only as a fallback so SEO surfaces
 * (sitemap, robots, canonical URLs, JobPosting JSON-LD, Open Graph) never
 * silently emit an incomplete/`undefined` URL if NEXT_PUBLIC_APP_URL is
 * missing. NEXT_PUBLIC_APP_URL remains the source of truth and is used
 * whenever it is set.
 *
 * Deliberately NOT used by email/auth-link generation (src/lib/email.ts,
 * src/lib/auth-email.ts, src/lib/firebase-action-link.ts) — those must keep
 * failing closed on a missing env var rather than silently emailing a link
 * built from a guessed domain.
 */
const PRODUCTION_ORIGIN = "https://hugerecruitment.co.uk";

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  return configured ? normalizeOrigin(configured) : PRODUCTION_ORIGIN;
}
