export function DashboardMetricCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon?: string;
  hint?: string;
}) {
  return (
    <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <span className="text-label-md text-on-surface-variant">{label}</span>
        {icon && (
          <div className="w-8 h-8 rounded bg-surface-container-low flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              {icon}
            </span>
          </div>
        )}
      </div>
      <div>
        <div className="text-headline-md text-on-surface">{value}</div>
        {hint && <div className="text-label-sm text-on-surface-variant mt-1">{hint}</div>}
      </div>
    </div>
  );
}
