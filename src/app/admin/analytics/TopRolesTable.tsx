import type { TopPerformingRole } from "@/lib/admin-metrics";

export function TopRolesTable({ roles }: { roles: TopPerformingRole[] }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col">
      <div className="p-4 border-b border-outline-variant bg-surface-container-low">
        <h3 className="text-headline-md text-on-surface">Top Performing Roles</h3>
      </div>
      {roles.length === 0 ? (
        <p className="text-body-md text-on-surface-variant p-8 text-center">No jobs with applicants yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-outline-variant">
                <th className="px-4 py-2 text-label-sm text-on-surface-variant font-semibold">Role Title</th>
                <th className="px-4 py-2 text-label-sm text-on-surface-variant font-semibold text-right">Applicants</th>
                <th className="px-4 py-2 text-label-sm text-on-surface-variant font-semibold text-right">Avg Days to Fill</th>
              </tr>
            </thead>
            <tbody className="text-on-surface">
              {roles.map((role) => (
                <tr key={role.id} className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container transition-colors">
                  <td className="px-4 py-2 font-medium">{role.title}</td>
                  <td className="px-4 py-2 text-right">{role.applicantCount}</td>
                  <td className="px-4 py-2 text-right">
                    {role.avgDaysToFill !== null ? `${role.avgDaysToFill} Days` : "In progress"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
