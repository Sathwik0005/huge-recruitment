const cardClass = "rounded-lg border border-outline-variant bg-surface p-6 space-y-4";

type EmployeeDeclarationValues = {
  declarationFullName: string | null;
  declarationAcceptedAt: Date | null;
};

/**
 * Read-only — unlike the other admin sections, the declaration has no edit
 * affordance. It's the candidate's own signed confirmation, so an admin can
 * view but never rewrite it.
 */
export function EmployeeDeclarationSection({ values }: { values: EmployeeDeclarationValues }) {
  return (
    <div className={cardClass}>
      <h2 className="text-headline-sm text-on-surface">Employee Declaration</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full Name (e-signature)" value={values.declarationFullName} />
        <Field label="Accepted At" value={values.declarationAcceptedAt ? values.declarationAcceptedAt.toLocaleString() : null} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-label-md text-on-surface-variant">{label}</p>
      <p className="text-body-md text-on-surface">{value || "—"}</p>
    </div>
  );
}
