import { prisma } from "@/lib/prisma";
import {
  getTotalCandidates,
  getActiveJobsCount,
  getPlacementRate,
  getPendingVerificationsCount,
  getApplicationStatusDistribution,
  getRecentApplications,
} from "@/lib/admin-metrics";
import { DashboardMetricCard } from "./DashboardMetricCard";
import { StatusDistributionChart } from "./StatusDistributionChart";
import { RecentApplicationsList } from "./RecentApplicationsList";
import { JobPagination } from "@/app/jobs/JobPagination";

const PAGE_SIZE = 10;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [
    totalCandidates,
    activeJobs,
    placementRate,
    pendingVerifications,
    distribution,
    recentApplications,
    tableTotal,
    tableRows,
  ] = await Promise.all([
    getTotalCandidates(),
    getActiveJobsCount(),
    getPlacementRate(),
    getPendingVerificationsCount(),
    getApplicationStatusDistribution(),
    getRecentApplications(5),
    prisma.jobApplication.count(),
    prisma.jobApplication.findMany({
      orderBy: { createdAt: "desc" },
      include: { job: { select: { title: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(tableTotal / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-lg text-primary">Overview</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Huge Requirements Limited — Key Metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardMetricCard label="Total Candidates" value={totalCandidates} icon="groups" />
        <DashboardMetricCard label="Active Jobs" value={activeJobs} icon="work_outline" />
        <DashboardMetricCard label="Placement Rate" value={`${placementRate}%`} icon="pie_chart" />
        <DashboardMetricCard label="Pending Verifications" value={pendingVerifications} icon="verified_user" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant p-6 flex flex-col">
          <h2 className="text-label-md font-bold text-on-surface uppercase tracking-wider mb-6">
            Applications by Status
          </h2>
          <StatusDistributionChart distribution={distribution} />
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 flex flex-col">
          <h2 className="text-label-md font-bold text-on-surface uppercase tracking-wider mb-6">Recent Applications</h2>
          <RecentApplicationsList applications={recentApplications} />
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low">
          <h2 className="text-label-md font-bold text-on-surface uppercase tracking-wider">All Applications</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface text-label-sm text-on-surface-variant border-b border-outline-variant">
                <th className="px-4 py-2 font-semibold">Candidate</th>
                <th className="px-4 py-2 font-semibold">Job</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold text-right">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {tableRows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-container transition-colors">
                  <td className="px-4 py-2 text-on-surface font-medium">{row.fullName}</td>
                  <td className="px-4 py-2 text-on-surface-variant">{row.job.title}</td>
                  <td className="px-4 py-2 text-on-surface-variant">{row.status}</td>
                  <td className="px-4 py-2 text-right text-on-surface-variant">
                    {row.createdAt.toLocaleDateString("en-GB")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-outline-variant bg-surface-container-low">
          <JobPagination page={page} pageCount={pageCount} searchParams={params} basePath="/admin" label="Dashboard pagination" />
        </div>
      </div>
    </div>
  );
}
