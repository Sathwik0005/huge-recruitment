import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getJobBySlugForDetailPage } from "@/lib/job-dto";
import { JobDetailHeader } from "./JobDetailHeader";
import {
  OverviewSection,
  ResponsibilitiesSection,
  RequirementsSection,
  ShiftsSection,
  PayDetailsSection,
  BenefitsSection,
  AdditionalInformationSection,
} from "./JobDetailSections";
import { GuestApplicationForm } from "./GuestApplicationForm";
import { SimilarJobs } from "./SimilarJobs";
import { excerptFromOverview } from "@/lib/job-formatters";
import { buildJobPostingJsonLd } from "@/lib/job-json-ld";
import { buildJobBreadcrumbJsonLd } from "@/lib/breadcrumb-json-ld";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJobBySlugForDetailPage(slug);
  if (!job) return { title: "Job not found" };

  const description = job.shortDescription || excerptFromOverview(job.overview, 160);
  const canonicalUrl = `${getSiteUrl()}/jobs/${job.slug}`;

  return {
    title: job.title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: job.title,
      description,
      url: canonicalUrl,
      type: "website",
    },
    // Closed/paused jobs stay reachable (see getJobBySlugForDetailPage) but
    // aren't worth ranking as if they were an open vacancy.
    robots: job.isOpen ? undefined : { index: false, follow: true },
  };
}

export default async function JobDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await getJobBySlugForDetailPage(slug);
  if (!job) notFound();

  const jobPostingJsonLd = job.isOpen ? buildJobPostingJsonLd(job) : null;
  const breadcrumbJsonLd = buildJobBreadcrumbJsonLd(job);

  return (
    <main className="min-h-screen bg-background pb-16">
      {jobPostingJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="mx-auto w-full max-w-container-max px-margin-mobile pt-6 md:px-margin-desktop md:pt-8">
        <nav aria-label="Breadcrumb" className="mb-6 overflow-x-auto">
          <ol className="flex min-w-max items-center gap-2 text-sm text-on-surface-variant">
            <li>
              <Link href="/" className="hover:text-primary">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="material-symbols-outlined text-[16px]">
              chevron_right
            </li>
            <li>
              <Link href="/jobs" className="hover:text-primary">
                Jobs
              </Link>
            </li>
            <li aria-hidden="true" className="material-symbols-outlined text-[16px]">
              chevron_right
            </li>
            <li>
              <Link href={`/jobs?sector=${job.sector.name}`} className="hover:text-primary">
                {job.sector.label}
              </Link>
            </li>
            <li aria-hidden="true" className="material-symbols-outlined text-[16px]">
              chevron_right
            </li>
            <li aria-current="page" className="max-w-[220px] truncate font-semibold text-primary sm:max-w-none">
              {job.title}
            </li>
          </ol>
        </nav>

        <JobDetailHeader job={job} isOpen={job.isOpen} />

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            <OverviewSection job={job} />
            <ResponsibilitiesSection job={job} />
            <RequirementsSection job={job} />
            <ShiftsSection job={job} />
            <PayDetailsSection job={job} />
            <BenefitsSection job={job} />
            <AdditionalInformationSection job={job} />
          </div>

          <aside id="apply" aria-labelledby="apply-heading" className="scroll-mt-24 lg:sticky lg:top-24">
            <GuestApplicationForm jobId={job.id} isOpen={job.isOpen} />
          </aside>
        </div>

        <SimilarJobs job={job} />
      </div>
    </main>
  );
}
