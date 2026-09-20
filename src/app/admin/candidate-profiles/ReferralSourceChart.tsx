import { ReferralSource } from "@/generated/prisma/enums";
import type { ReferralSourceCount } from "@/lib/admin-metrics";

const REFERRAL_LABELS: Record<ReferralSource, string> = {
  INDEED_JOB_BOARD: "Indeed / Job Board",
  GOOGLE_SEARCH: "Google Search",
  SOCIAL_MEDIA: "Social Media",
  FRIEND_COLLEAGUE_REFERRAL: "Friend / Colleague",
  JOBCENTRE_PLUS: "Jobcentre Plus",
  OTHER: "Other",
};

export function ReferralSourceChart({ data }: { data: ReferralSourceCount[] }) {
  if (data.length === 0) {
    return <p className="text-label-md text-on-surface-variant">No data yet.</p>;
  }

  const total = data.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="flex-1 flex flex-col gap-3 justify-center">
      {data.map((entry) => {
        const pct = total === 0 ? 0 : Math.round((entry.count / total) * 100);
        return (
          <div key={entry.source}>
            <div className="flex justify-between text-label-sm text-on-surface-variant mb-1">
              <span>{REFERRAL_LABELS[entry.source]}</span>
              <span>
                {entry.count} ({pct}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-container-low overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
