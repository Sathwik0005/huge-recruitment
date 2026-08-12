import { Prisma } from "@/generated/prisma/client";
import { PayPeriod, PayType } from "@/generated/prisma/enums";

const moneyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PERIOD_LABELS: Record<PayPeriod, string> = {
  HOUR: "hour",
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  PERMANENT: "Permanent",
  TEMPORARY: "Temporary",
  TEMP_TO_PERM: "Temp to Perm",
  FIXED_TERM: "Fixed Term",
  CONTRACT: "Contract",
};

type PayRateLike = {
  minimum: Prisma.Decimal | number | string;
  maximum: Prisma.Decimal | number | string | null;
  period: PayPeriod;
};

function formatAmount(value: Prisma.Decimal | number | string): string {
  return moneyFormatter.format(new Prisma.Decimal(value).toNumber());
}

/** Formats a single JobPayRate as e.g. "£15.33 – £16.00 per hour" or "£15.33 per hour". */
export function formatPayRate(rate: PayRateLike): string {
  const minimum = formatAmount(rate.minimum);
  const maximum = rate.maximum != null ? ` – ${formatAmount(rate.maximum)}` : "";
  return `${minimum}${maximum} per ${PERIOD_LABELS[rate.period]}`;
}

type JobPayLike = {
  payType: PayType;
  payRates: (PayRateLike & { isPrimary: boolean })[];
};

/**
 * Formats a job's public pay display: the primary numeric rate (falling back
 * to the first rate if none is flagged primary), or "Competitive" — never a
 * raw admin-typed string.
 */
export function formatJobPay(job: JobPayLike): string {
  if (job.payType === PayType.COMPETITIVE) return "Competitive";
  const primary = job.payRates.find((rate) => rate.isPrimary) ?? job.payRates[0];
  if (!primary) return "Competitive";
  return formatPayRate(primary);
}

type LocationLike = {
  townOrCity: string;
  countyOrRegion?: string | null;
  postcode?: string | null;
};

export function formatJobLocation(job: LocationLike): string {
  return [job.townOrCity, job.countyOrRegion, job.postcode].filter(Boolean).join(", ");
}

export function formatEmploymentType(employmentType: string): string {
  return EMPLOYMENT_TYPE_LABELS[employmentType] ?? employmentType;
}

/** Relative posted-date text computed from a real `publishedAt` timestamp — never admin-typed. */
export function formatRelativePostedDate(publishedAt: Date, now: Date = new Date()): string {
  const differenceInDays = Math.max(0, Math.floor((now.getTime() - publishedAt.getTime()) / 86_400_000));

  if (differenceInDays === 0) return "Posted today";
  if (differenceInDays === 1) return "Posted yesterday";
  if (differenceInDays < 7) return `Posted ${differenceInDays} days ago`;

  return `Posted ${new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(publishedAt)}`;
}

/** Presentation-boundary excerpt fallback — never mutates the stored `overview`. */
export function excerptFromOverview(overview: string, maxLength = 180): string {
  const trimmed = overview.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const truncated = trimmed.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength)}…`;
}
