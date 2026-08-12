import { notFound, redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin-session";
import { prisma } from "@/lib/prisma";
import { PUBLIC_JOB_SELECT } from "@/lib/job-dto";
import { JobDetailHeader } from "@/app/jobs/[slug]/JobDetailHeader";
import {
  OverviewSection,
  ResponsibilitiesSection,
  RequirementsSection,
  ShiftsSection,
  PayDetailsSection,
  BenefitsSection,
  AdditionalInformationSection,
} from "@/app/jobs/[slug]/JobDetailSections";

export default async function JobPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (session.status !== "ok") redirect(session.status === "forbidden" ? "/" : "/login");

  const { id } = await params;
  // Bypasses job-dto's PUBLISHED-only filter — admin previews possibly-DRAFT
  // jobs — but reuses the exact same public projection shape so the section
  // components render identically to the real /jobs/[slug] page.
  const job = await prisma.job.findUnique({ where: { id }, select: PUBLIC_JOB_SELECT });
  if (!job) notFound();

  return (
    <div className="space-y-4">
      <p className="text-label-md text-on-surface-variant bg-surface-container-low rounded-lg px-4 py-3">
        Preview — not public yet ({job.status})
      </p>

      <JobDetailHeader job={job} isOpen={job.status === "PUBLISHED"} />

      <div className="space-y-5">
        <OverviewSection job={job} />
        <ResponsibilitiesSection job={job} />
        <RequirementsSection job={job} />
        <ShiftsSection job={job} />
        <PayDetailsSection job={job} />
        <BenefitsSection job={job} />
        <AdditionalInformationSection job={job} />
      </div>

      <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4 text-label-md text-on-surface-variant">
        The guest application form is disabled in preview — no submissions are possible from this page.
      </div>
    </div>
  );
}
