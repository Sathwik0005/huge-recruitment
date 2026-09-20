"use client";

import { useState } from "react";

function mask(value: string): string {
  if (value.length <= 4) return "*".repeat(value.length);
  return "*".repeat(value.length - 4) + value.slice(-4);
}

/** Renders a sensitive value masked by default (last 4 chars visible) with a client-side Show/Hide toggle — no extra request. */
export function MaskedField({ label, value }: { label: string; value: string | null }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div>
      <p className="text-label-md text-on-surface-variant">{label}</p>
      {value ? (
        <div className="flex items-center gap-2">
          <p className="text-body-md text-on-surface font-mono">{revealed ? value : mask(value)}</p>
          <button
            type="button"
            onClick={() => setRevealed((prev) => !prev)}
            className="text-label-sm text-primary font-bold hover:underline"
          >
            {revealed ? "Hide" : "Show"}
          </button>
        </div>
      ) : (
        <p className="text-body-md text-on-surface-variant">—</p>
      )}
    </div>
  );
}
