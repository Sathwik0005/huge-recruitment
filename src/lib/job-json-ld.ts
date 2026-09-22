import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { EmploymentType, PayType } from "@/generated/prisma/enums";
import type { PublicJob } from "@/lib/job-dto";
import { getSiteUrl } from "@/lib/site-url";
import { SITE_NAME, LOGO_URL } from "@/lib/brand";

// schema.org/JobPosting only accepts a fixed enum for employmentType. Our
// EmploymentType values don't map 1:1, so this is a specification-compliance
// mapping, not invented data — every value here is still derived from the
// job's real `employmentType`.
const SCHEMA_EMPLOYMENT_TYPE: Record<EmploymentType, string | string[]> = {
  [EmploymentType.PERMANENT]: "FULL_TIME",
  [EmploymentType.TEMPORARY]: "TEMPORARY",
  [EmploymentType.TEMP_TO_PERM]: ["TEMPORARY", "FULL_TIME"],
  [EmploymentType.FIXED_TERM]: "OTHER",
  [EmploymentType.CONTRACT]: "CONTRACTOR",
};

/**
 * Builds schema.org/JobPosting JSON-LD for a single public job. Only ever
 * called for jobs the caller has already confirmed are open (`isOpen`) —
 * closed/paused jobs intentionally get no JobPosting markup rather than
 * being described as an active posting.
 */
export function buildJobPostingJsonLd(job: PublicJob) {
  const siteUrl = getSiteUrl();
  const primaryRate = job.payRates.find((rate) => rate.isPrimary) ?? job.payRates[0];

  const baseSalary =
    job.payType === PayType.NUMERIC && primaryRate
      ? {
          "@type": "MonetaryAmount",
          currency: job.currency,
          value: {
            "@type": "QuantitativeValue",
            minValue: new Prisma.Decimal(primaryRate.minimum).toNumber(),
            ...(primaryRate.maximum != null
              ? { maxValue: new Prisma.Decimal(primaryRate.maximum).toNumber() }
              : {}),
            unitText: primaryRate.period,
          },
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.overview,
    identifier: job.referenceCode
      ? { "@type": "PropertyValue", name: SITE_NAME, value: job.referenceCode }
      : undefined,
    datePosted: job.publishedAt ? job.publishedAt.toISOString() : undefined,
    validThrough: job.closingDate ? job.closingDate.toISOString() : undefined,
    employmentType: SCHEMA_EMPLOYMENT_TYPE[job.employmentType],
    // Applications are submitted entirely on-site via /api/applications —
    // there is no external ATS redirect, so this is accurate, not aspirational.
    directApply: true,
    hiringOrganization: {
      "@type": "Organization",
      name: SITE_NAME,
      sameAs: siteUrl,
      logo: LOGO_URL,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.townOrCity,
        addressRegion: job.countyOrRegion ?? undefined,
        postalCode: job.postcode ?? undefined,
        addressCountry: "GB",
      },
    },
    baseSalary,
  };
}
