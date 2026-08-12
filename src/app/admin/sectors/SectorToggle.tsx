"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSectorActive, forceDeactivateSector } from "./actions";

export function SectorToggle({ sectorId, isActive }: { sectorId: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [warning, setWarning] = useState<number>();
  const [error, setError] = useState<string>();

  function handleToggle() {
    const next = !isActive;
    setError(undefined);
    setWarning(undefined);
    startTransition(async () => {
      const result = await toggleSectorActive(sectorId, next);
      if (result.success) {
        router.refresh();
        return;
      }
      if (result.error === "jobs-reference-sector" && result.activeJobCount !== undefined) {
        setWarning(result.activeJobCount);
        return;
      }
      setError(result.error);
    });
  }

  function handleConfirmDeactivate() {
    startTransition(async () => {
      const result = await forceDeactivateSector(sectorId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setWarning(undefined);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={handleToggle}
        className={`h-10 px-4 rounded-lg text-label-md font-bold transition-all disabled:opacity-60 ${
          isActive
            ? "border border-error text-error hover:bg-error hover:text-on-error"
            : "border border-primary text-primary hover:bg-primary hover:text-on-primary"
        }`}
      >
        {isActive ? "Deactivate" : "Activate"}
      </button>

      {warning !== undefined && (
        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 space-y-2 text-label-md">
          <p>
            {warning} job{warning === 1 ? " is" : "s are"} still using this sector. Deactivating hides it from the
            &ldquo;create job&rdquo; picker, but those jobs will keep working. To remove it entirely, first move or
            close those jobs.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmDeactivate}
              className="h-9 px-4 rounded-lg bg-error text-on-error font-bold"
            >
              Deactivate anyway
            </button>
            <button type="button" onClick={() => setWarning(undefined)} className="h-9 px-4 rounded-lg border border-outline-variant">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-label-sm text-error">{error}</p>}
    </div>
  );
}
