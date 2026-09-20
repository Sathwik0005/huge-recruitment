import type { OnboardingFunnel } from "@/lib/admin-metrics";

export function OnboardingFunnelChart({ funnel }: { funnel: OnboardingFunnel }) {
  const stages = [
    { label: "Started", count: funnel.started },
    { label: "Step 1 Done", count: funnel.step1Completed },
    { label: "Step 2 Done", count: funnel.step2Completed },
    { label: "Submitted", count: funnel.step3Completed },
  ];
  const max = Math.max(1, funnel.started);

  return (
    <div className="flex-1 flex items-end gap-4 h-64">
      {stages.map((stage) => {
        const heightPct = Math.round((stage.count / max) * 100);
        const pctOfStarted = funnel.started === 0 ? 0 : Math.round((stage.count / funnel.started) * 100);
        return (
          <div key={stage.label} className="flex-1 flex flex-col justify-end items-center h-full">
            <span className="text-label-sm text-on-surface-variant mb-1">
              {stage.count} ({pctOfStarted}%)
            </span>
            <div
              className="w-full max-w-[60px] rounded-t-sm bg-primary"
              style={{ height: `${Math.max(heightPct, stage.count > 0 ? 4 : 0)}%` }}
            />
            <span className="text-label-sm text-on-surface-variant mt-2 text-center">{stage.label}</span>
          </div>
        );
      })}
    </div>
  );
}
