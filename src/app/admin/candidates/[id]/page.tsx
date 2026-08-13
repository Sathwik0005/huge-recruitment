import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/lib/require-admin-session";
import { prisma } from "@/lib/prisma";
import { deriveCandidateVerification, type CandidateVerification } from "@/lib/admin-metrics";
import { ApplicationStatusSelect } from "../ApplicationStatusSelect";

const VERIFICATION_STYLES: Record<CandidateVerification, string> = {
  verified: "bg-status-success/10 text-status-success border border-status-success/20",
  pending: "bg-status-warning/10 text-status-warning border border-status-warning/20",
  inactive: "bg-surface-container-highest text-on-surface-variant border border-outline-variant",
};

const VERIFICATION_LABELS: Record<CandidateVerification, string> = {
  verified: "Verified",
  pending: "Pending",
  inactive: "Inactive",
};

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (session.status !== "ok") redirect(session.status === "forbidden" ? "/" : "/login");

  const { id } = await params;
  const application = await prisma.jobApplication.findUnique({
    where: { id },
    include: { job: { select: { id: true, title: true, referenceCode: true } } },
  });
  if (!application) notFound();

  const verification = deriveCandidateVerification(application.status);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/admin/candidates" className="text-label-md text-primary hover:underline">
          ← Back to candidates
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-headline-lg text-primary">{application.fullName}</h1>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-label-sm ${VERIFICATION_STYLES[verification]}`}>
            {VERIFICATION_LABELS[verification]}
          </span>
        </div>
        <p className="text-body-md text-on-surface-variant">
          Applied for{" "}
          <Link href={`/admin/jobs/${application.job.id}/edit`} className="font-bold text-primary hover:underline">
            {application.job.title}
          </Link>
        </p>
        <p className="text-label-sm text-on-surface-variant">Reference: {application.publicReference}</p>
      </div>

      <section className="rounded-lg border border-outline-variant bg-surface p-6 space-y-3">
        <dl className="grid grid-cols-2 gap-4 text-body-md">
          <div>
            <dt className="text-label-sm text-on-surface-variant">Email</dt>
            <dd>{application.email}</dd>
          </div>
          <div>
            <dt className="text-label-sm text-on-surface-variant">Phone</dt>
            <dd>{application.phone}</dd>
          </div>
          <div>
            <dt className="text-label-sm text-on-surface-variant">Location</dt>
            <dd>{application.location}</dd>
          </div>
          <div>
            <dt className="text-label-sm text-on-surface-variant">Applied</dt>
            <dd>{application.createdAt.toLocaleString("en-GB")}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-outline-variant bg-surface p-6 space-y-3">
        <h2 className="text-headline-md text-primary">CV</h2>
        {application.cvBlobPathname ? (
          <a
            href={`/api/admin/applications/${application.id}/cv`}
            className="inline-flex h-11 px-5 items-center rounded-lg border border-primary text-primary font-bold hover:bg-primary hover:text-on-primary transition-all"
          >
            Download {application.cvOriginalFilename ?? "CV"}
          </a>
        ) : (
          <p className="text-body-md text-on-surface-variant">No CV was submitted with this application.</p>
        )}
      </section>

      <section className="rounded-lg border border-outline-variant bg-surface p-6 space-y-3">
        <h2 className="text-headline-md text-primary">Status</h2>
        <ApplicationStatusSelect applicationId={application.id} status={application.status} />
      </section>
    </div>
  );
}
