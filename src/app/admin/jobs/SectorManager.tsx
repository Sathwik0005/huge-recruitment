"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSectorActive, forceDeactivateSector } from "../sectors/actions";

type SectorRow = { id: string; label: string; isActive: boolean };

function SectorRowToggle({ sector }: { sector: SectorRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [warning, setWarning] = useState<number>();
  const [error, setError] = useState<string>();

  function handleToggle() {
    const next = !sector.isActive;
    setError(undefined);
    setWarning(undefined);
    startTransition(async () => {
      const result = await toggleSectorActive(sector.id, next);
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
      const result = await forceDeactivateSector(sector.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setWarning(undefined);
      router.refresh();
    });
  }

  return (
    <li className="flex flex-col gap-2 py-2 border-b border-outline-variant last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-body-md text-on-surface">{sector.label}</span>
        <button
          type="button"
          disabled={pending}
          onClick={handleToggle}
          className={`h-9 px-3 rounded-lg text-label-sm font-bold transition-all disabled:opacity-60 ${
            sector.isActive
              ? "border border-error text-error hover:bg-error hover:text-on-error"
              : "border border-primary text-primary hover:bg-primary hover:text-on-primary"
          }`}
        >
          {sector.isActive ? "Deactivate" : "Activate"}
        </button>
      </div>
      {warning !== undefined && (
        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 space-y-2 text-label-sm">
          <p>
            {warning} job{warning === 1 ? " is" : "s are"} still using this sector. Deactivating hides it from this
            picker, but those jobs keep working.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={handleConfirmDeactivate} className="h-8 px-3 rounded-lg bg-error text-on-error font-bold">
              Deactivate anyway
            </button>
            <button type="button" onClick={() => setWarning(undefined)} className="h-8 px-3 rounded-lg border border-outline-variant">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-label-sm text-error">{error}</p>}
    </li>
  );
}

export function SectorManager({ sectors }: { sectors: SectorRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-label-sm text-primary font-bold hover:underline"
      >
        {open ? "Hide sector manager" : "Manage sectors"}
      </button>
      {open && (
        <ul className="mt-2 rounded-lg border border-outline-variant bg-surface p-3">
          {sectors.map((sector) => (
            <SectorRowToggle key={sector.id} sector={sector} />
          ))}
        </ul>
      )}
    </div>
  );
}
