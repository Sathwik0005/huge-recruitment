import Link from "next/link";
import type { RecentApplication } from "@/lib/admin-metrics";

export function RecentApplicationsList({ applications }: { applications: RecentApplication[] }) {
  if (applications.length === 0) {
    return <p className="text-label-md text-on-surface-variant">No applications yet.</p>;
  }

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-y-auto filters-scrollbar max-h-[320px]">
      {applications.map((application) => (
        <Link
          key={application.id}
          href={`/admin/candidates/${application.id}`}
          className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant/50 hover:bg-surface-container-low transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-label-md text-on-surface truncate">{application.fullName}</p>
            <p className="text-label-sm text-on-surface-variant truncate">{application.job.title}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-label-md text-on-surface">{application.status}</p>
            <p className="text-label-sm text-on-surface-variant">{application.createdAt.toLocaleDateString("en-GB")}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
