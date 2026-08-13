"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleClientActive } from "./actions";

export function ClientToggleButton({ clientId, isActive }: { clientId: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleToggle() {
    setError(undefined);
    startTransition(async () => {
      const result = await toggleClientActive(clientId, !isActive);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        onClick={handleToggle}
        className={`h-9 px-4 rounded-lg text-label-sm font-bold transition-all disabled:opacity-60 ${
          isActive
            ? "border border-error text-error hover:bg-error hover:text-on-error"
            : "border border-primary text-primary hover:bg-primary hover:text-on-primary"
        }`}
      >
        {isActive ? "Deactivate" : "Activate"}
      </button>
      {error && <p className="text-label-sm text-error">{error}</p>}
    </div>
  );
}
