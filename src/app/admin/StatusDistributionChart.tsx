import { ApplicationStatus } from "@/generated/prisma/enums";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  NEW: "New",
  REVIEWING: "Reviewing",
  SHORTLISTED: "Shortlisted",
  REJECTED: "Rejected",
  HIRED: "Hired",
  WITHDRAWN: "Withdrawn",
};

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  NEW: "bg-status-info",
  REVIEWING: "bg-secondary",
  SHORTLISTED: "bg-primary-container",
  REJECTED: "bg-status-danger",
  HIRED: "bg-status-success",
  WITHDRAWN: "bg-outline-variant",
};

export function StatusDistributionChart({ distribution }: { distribution: Record<ApplicationStatus, number> }) {
  const entries = Object.values(ApplicationStatus).map((status) => ({ status, count: distribution[status] }));
  const max = Math.max(1, ...entries.map((entry) => entry.count));

  return (
    <div className="flex-1 flex items-end gap-4 h-64">
      {entries.map((entry) => {
        const heightPct = Math.round((entry.count / max) * 100);
        return (
          <div key={entry.status} className="flex-1 flex flex-col justify-end items-center h-full">
            <span className="text-label-sm text-on-surface-variant mb-1">{entry.count}</span>
            <div
              className={`w-full max-w-[60px] rounded-t-sm ${STATUS_COLORS[entry.status]}`}
              style={{ height: `${Math.max(heightPct, entry.count > 0 ? 4 : 0)}%` }}
            />
            <span className="text-label-sm text-on-surface-variant mt-2 text-center">{STATUS_LABELS[entry.status]}</span>
          </div>
        );
      })}
    </div>
  );
}
