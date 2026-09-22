import { ImageResponse } from "next/og";
import { getJobBySlugForDetailPage } from "@/lib/job-dto";
import { formatJobLocation, formatEmploymentType } from "@/lib/job-formatters";
import { BrandOgCard } from "@/lib/og-image-card";

export const alt = "Huge Recruitment job opening";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await getJobBySlugForDetailPage(slug);

  if (!job) {
    return new ImageResponse(
      <BrandOgCard headline="Specialist industrial recruitment across the UK" />,
      { ...size },
    );
  }

  const meta = `${formatJobLocation(job)} · ${formatEmploymentType(job.employmentType)}`;

  return new ImageResponse(<BrandOgCard headline={job.title} meta={meta} />, { ...size });
}
