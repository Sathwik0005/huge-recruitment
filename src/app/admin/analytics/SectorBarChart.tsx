import type { SectorApplicationCount } from "@/lib/admin-metrics";

export function SectorBarChart({ data }: { data: SectorApplicationCount[] }) {
  const max = Math.max(1, ...data.map((entry) => entry.count));

  return (
    <div className="flex-1 flex items-end gap-4 h-64">
      {data.map((entry) => {
        const heightPct = Math.round((entry.count / max) * 100);
        return (
          <div key={entry.sector} className="flex-1 flex flex-col justify-end items-center h-full">
            <span className="text-label-sm text-on-surface-variant mb-1">{entry.count}</span>
            <div
              className="w-full max-w-[60px] rounded-t-sm bg-primary"
              style={{ height: `${Math.max(heightPct, entry.count > 0 ? 4 : 0)}%` }}
            />
            <span className="text-label-sm text-on-surface-variant mt-2 text-center">{entry.label}</span>
          </div>
        );
      })}
    </div>
  );
}
