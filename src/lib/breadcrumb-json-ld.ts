import "server-only";
import type { PublicJob } from "@/lib/job-dto";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Mirrors the visual breadcrumb nav in the job detail page exactly
 * (Home → Jobs → sector → job title) — keep both in sync.
 */
export function buildJobBreadcrumbJsonLd(job: Pick<PublicJob, "slug" | "title" | "sector">) {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Jobs", item: `${siteUrl}/jobs` },
      {
        "@type": "ListItem",
        position: 3,
        name: job.sector.label,
        item: `${siteUrl}/jobs?sector=${job.sector.name}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: job.title,
        item: `${siteUrl}/jobs/${job.slug}`,
      },
    ],
  };
}
