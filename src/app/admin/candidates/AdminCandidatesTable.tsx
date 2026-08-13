import Link from "next/link";
import { ApplicationStatus } from "@/generated/prisma/enums";
import { deriveCandidateVerification, type CandidateVerification } from "@/lib/admin-metrics";
import { ApplicationStatusSelect } from "./ApplicationStatusSelect";

type CandidateRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  status: ApplicationStatus;
  createdAt: Date;
  job: { title: string };
};

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

export function AdminCandidatesTable({ candidates }: { candidates: CandidateRow[] }) {
  if (candidates.length === 0) {
    return (
      <p className="text-body-md text-on-surface-variant rounded-lg border border-outline-variant p-8 text-center">
        No candidates match these filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant">
      <table className="w-full text-left text-body-md min-w-[800px]">
        <thead className="bg-surface-container-low text-label-sm uppercase text-on-surface-variant">
          <tr>
            <th className="px-4 py-3">Candidate</th>
            <th className="px-4 py-3">Job</th>
            <th className="px-4 py-3">Applied</th>
            <th className="px-4 py-3">Verification</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {candidates.map((candidate) => {
            const verification = deriveCandidateVerification(candidate.status);
            return (
              <tr key={candidate.id} className="hover:bg-surface-container-lowest">
                <td className="px-4 py-3">
                  <Link href={`/admin/candidates/${candidate.id}`} className="font-bold text-primary hover:underline">
                    {candidate.fullName}
                  </Link>
                  <p className="text-label-sm text-on-surface-variant">{candidate.email}</p>
                </td>
                <td className="px-4 py-3">{candidate.job.title}</td>
                <td className="px-4 py-3 text-label-sm text-on-surface-variant">
                  {candidate.createdAt.toLocaleDateString("en-GB")}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-label-sm ${VERIFICATION_STYLES[verification]}`}>
                    {VERIFICATION_LABELS[verification]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ApplicationStatusSelect applicationId={candidate.id} status={candidate.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
