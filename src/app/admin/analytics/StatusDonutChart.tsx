import { ApplicationStatus } from "@/generated/prisma/enums";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  NEW: "New",
  REVIEWING: "Reviewing",
  SHORTLISTED: "Shortlisted",
  REJECTED: "Rejected",
  HIRED: "Hired",
  WITHDRAWN: "Withdrawn",
};

const STATUS_HEX: Record<ApplicationStatus, string> = {
  NEW: "#3B82F6",
  REVIEWING: "#40627a",
  SHORTLISTED: "#1e3a5f",
  REJECTED: "#EF4444",
  HIRED: "#10B981",
  WITHDRAWN: "#C4C6CF",
};

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function StatusDonutChart({ distribution }: { distribution: Record<ApplicationStatus, number> }) {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  const entries = Object.values(ApplicationStatus).map((status) => ({ status, count: distribution[status] }));

  let cumulativeOffset = 0;
  const segments = entries
    .filter((entry) => entry.count > 0)
    .map((entry) => {
      const fraction = total > 0 ? entry.count / total : 0;
      const length = fraction * CIRCUMFERENCE;
      const segment = {
        status: entry.status,
        dasharray: `${length} ${CIRCUMFERENCE - length}`,
        dashoffset: -cumulativeOffset,
      };
      cumulativeOffset += length;
      return segment;
    });

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48 mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" role="img" aria-label="Applications by status">
          {segments.length === 0 ? (
            <circle cx="50" cy="50" fill="transparent" r={RADIUS} stroke="var(--color-outline-variant)" strokeWidth="15" />
          ) : (
            segments.map((segment) => (
              <circle
                key={segment.status}
                cx="50"
                cy="50"
                fill="transparent"
                r={RADIUS}
                stroke={STATUS_HEX[segment.status]}
                strokeDasharray={segment.dasharray}
                strokeDashoffset={segment.dashoffset}
                strokeWidth="15"
              />
            ))
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-headline-md text-on-surface font-bold">{total}</span>
          <span className="text-label-sm text-on-surface-variant">Total</span>
        </div>
      </div>
      <div className="w-full grid grid-cols-2 gap-3">
        {entries.map((entry) => (
          <div key={entry.status} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATUS_HEX[entry.status] }} />
            <span className="text-label-sm text-on-surface">
              {STATUS_LABELS[entry.status]} ({entry.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
