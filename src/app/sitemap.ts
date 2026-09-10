import type { MetadataRoute } from "next";
import { getPublicJobs } from "@/lib/job-dto";
import { getSiteUrl } from "@/lib/site-url";

type StaticRoute = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
};

const STATIC_ROUTES: StaticRoute[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/jobs", changeFrequency: "daily", priority: 0.9 },
  { path: "/sectors", changeFrequency: "monthly", priority: 0.6 },
  { path: "/employers", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact-us", changeFrequency: "yearly", priority: 0.4 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms-of-service", changeFrequency: "yearly", priority: 0.2 },
];

const JOB_PAGE_SIZE = 500;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // getPublicJobs already applies the single canonical "publicly visible"
  // filter (PUBLISHED, within its start/closing window) shared by every
  // public job query — see src/lib/job-dto.ts. Draft/paused/closed/archived
  // jobs are never included here.
  const jobEntries: MetadataRoute.Sitemap = [];
  let page = 1;
  while (true) {
    const { jobs, pageCount } = await getPublicJobs({ page, pageSize: JOB_PAGE_SIZE });
    for (const job of jobs) {
      jobEntries.push({
        url: `${siteUrl}/jobs/${job.slug}`,
        lastModified: job.publishedAt ?? undefined,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
    if (page >= pageCount) break;
    page += 1;
  }

  return [...staticEntries, ...jobEntries];
}
