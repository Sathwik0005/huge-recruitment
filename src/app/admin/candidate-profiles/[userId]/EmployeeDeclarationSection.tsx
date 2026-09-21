const cardClass = "rounded-lg border border-outline-variant bg-surface p-6 space-y-4";

type EmployeeDeclarationValues = {
  declarationFullName: string | null;
  declarationAcceptedAt: Date | null;
};

/**
 * Read-only — unlike the other admin sections, the declaration has no edit
 * affordance. It's the candidate's own signed confirmation, so an admin can
 * view but never rewrite it. `signatureUrl` is a short-lived signed URL for
 * the drawn signature, resolved server-side in page.tsx (same pattern as the
 * avatar/document viewers) — never cached, never passed the raw S3 key.
 */
export function EmployeeDeclarationSection({
  values,
  signatureUrl,
}: {
  values: EmployeeDeclarationValues;
  signatureUrl: string | null;
}) {
  return (
    <div className={cardClass}>
      <h2 className="text-headline-sm text-on-surface">Employee Declaration</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full Name" value={values.declarationFullName} />
        <Field label="Accepted At" value={values.declarationAcceptedAt ? values.declarationAcceptedAt.toLocaleString() : null} />
      </div>
      <div>
        <p className="text-label-md text-on-surface-variant mb-1">Signature</p>
        {signatureUrl ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-2 inline-flex items-center justify-center h-32">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed S3 URL, not an optimizable static asset */}
            <img src={signatureUrl} alt="Candidate's signature" className="max-h-full max-w-[280px] object-contain" />
          </div>
        ) : (
          <p className="text-body-md text-on-surface">—</p>
        )}
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
