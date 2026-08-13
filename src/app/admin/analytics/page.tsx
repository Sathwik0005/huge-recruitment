import {
  getAvgTimeToFillDays,
  getTotalPlacementsYtd,
  getTotalActiveEmployers,
  getApplicationsBySector,
  getApplicationStatusDistribution,
  getTopEmployers,
  getTopPerformingRoles,
} from "@/lib/admin-metrics";
import { DashboardMetricCard } from "../DashboardMetricCard";
import { SectorBarChart } from "./SectorBarChart";
import { StatusDonutChart } from "./StatusDonutChart";
import { TopEmployersTable } from "./TopEmployersTable";
import { TopRolesTable } from "./TopRolesTable";

export default async function AdminAnalyticsPage() {
  const [avgTimeToFillDays, placementsYtd, activeEmployers, applicationsBySector, statusDistribution, topEmployers, topRoles] =
    await Promise.all([
      getAvgTimeToFillDays(),
      getTotalPlacementsYtd(),
      getTotalActiveEmployers(),
      getApplicationsBySector(),
      getApplicationStatusDistribution(),
      getTopEmployers(),
      getTopPerformingRoles(),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-lg text-on-surface">Analytics</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Real recruitment metrics — job, sector, and placement performance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardMetricCard
          label="Total Active Employers"
          value={activeEmployers}
          icon="business"
        />
        <DashboardMetricCard
          label="Avg. Time to Fill"
          value={avgTimeToFillDays !== null ? `${avgTimeToFillDays} Days` : "—"}
          icon="timer"
        />
        <DashboardMetricCard label="Total Placements YTD" value={placementsYtd} icon="how_to_reg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col">
          <h3 className="text-headline-md text-on-surface mb-6">Applications by Sector</h3>
          <SectorBarChart data={applicationsBySector} />
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col items-center">
          <h3 className="text-headline-md text-on-surface w-full text-left mb-6">Applications by Status</h3>
          <StatusDonutChart distribution={statusDistribution} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopEmployersTable employers={topEmployers} />
        <TopRolesTable roles={topRoles} />
      </div>
    </div>
  );
}
