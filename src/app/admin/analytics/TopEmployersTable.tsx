import type { TopEmployer } from "@/lib/admin-metrics";

export function TopEmployersTable({ employers }: { employers: TopEmployer[] }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col">
      <div className="p-4 border-b border-outline-variant bg-surface-container-low">
        <h3 className="text-headline-md text-on-surface">Top Employers</h3>
      </div>
      {employers.length === 0 ? (
        <p className="text-body-md text-on-surface-variant p-8 text-center">No placements recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-outline-variant">
                <th className="px-4 py-2 text-label-sm text-on-surface-variant font-semibold">Employer</th>
                <th className="px-4 py-2 text-label-sm text-on-surface-variant font-semibold">Sector</th>
                <th className="px-4 py-2 text-label-sm text-on-surface-variant font-semibold text-right">Placements</th>
              </tr>
            </thead>
            <tbody className="text-on-surface">
              {employers.map((employer) => (
                <tr key={employer.id} className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container transition-colors">
                  <td className="px-4 py-2 font-medium">{employer.name}</td>
                  <td className="px-4 py-2 text-on-surface-variant">{employer.sectorLabel ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{employer.placementCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
