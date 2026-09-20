import Link from "next/link";
import { EditingUnlockToggle } from "./EditingUnlockToggle";

type CandidateProfileRow = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  onboardingStep: number;
  step4CompletedAt: Date | null;
  editingUnlockedByAdmin: boolean;
};

const TOTAL_STEPS = 4;

function statusLabel(row: CandidateProfileRow): string {
  if (row.step4CompletedAt) return "Submitted";
  return `Step ${row.onboardingStep} of ${TOTAL_STEPS}`;
}

export function CandidateProfileTable({ rows }: { rows: CandidateProfileRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-body-md text-on-surface-variant rounded-lg border border-outline-variant p-8 text-center">
        No candidate profiles match this search.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant">
      <table className="w-full text-left text-body-md min-w-[700px]">
        <thead className="bg-surface-container-low text-label-sm uppercase text-on-surface-variant">
          <tr>
            <th className="px-4 py-3">Candidate</th>
            <th className="px-4 py-3">Onboarding Status</th>
            <th className="px-4 py-3">Submitted</th>
            <th className="px-4 py-3">Editing</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {rows.map((row) => (
            <tr key={row.userId} className="hover:bg-surface-container-lowest">
              <td className="px-4 py-3">
                <Link href={`/admin/candidate-profiles/${row.userId}`} className="font-bold text-on-surface hover:underline">
                  {row.firstName} {row.lastName}
                </Link>
                <p className="text-label-sm text-on-surface-variant">{row.email}</p>
              </td>
              <td className="px-4 py-3">{statusLabel(row)}</td>
              <td className="px-4 py-3 text-label-sm text-on-surface-variant">
                {row.step4CompletedAt ? row.step4CompletedAt.toLocaleDateString("en-GB") : "—"}
              </td>
              <td className="px-4 py-3">
                {row.step4CompletedAt ? (
                  <EditingUnlockToggle userId={row.userId} unlocked={row.editingUnlockedByAdmin} />
                ) : (
                  <span className="text-label-sm text-on-surface-variant">Not submitted yet</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/candidate-profiles/${row.userId}`}
                  className="h-9 px-3 rounded-lg border border-primary text-primary font-bold text-label-sm hover:bg-primary/10 transition-colors inline-flex items-center"
                >
                  View profile
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
