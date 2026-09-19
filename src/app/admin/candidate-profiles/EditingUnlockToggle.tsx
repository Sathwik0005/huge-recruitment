"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCandidateEditingUnlocked } from "./actions";

export function EditingUnlockToggle({ userId, unlocked }: { userId: string; unlocked: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleClick() {
    setError(undefined);
    startTransition(async () => {
      const result = await setCandidateEditingUnlocked(userId, !unlocked);
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
        onClick={handleClick}
        disabled={pending}
        className={
          unlocked
            ? "h-9 px-3 rounded-lg border border-status-warning text-status-warning font-bold text-label-sm hover:bg-status-warning/10 transition-colors disabled:opacity-60"
            : "h-9 px-3 rounded-lg border border-primary text-primary font-bold text-label-sm hover:bg-primary/10 transition-colors disabled:opacity-60"
        }
      >
        {pending ? "Saving..." : unlocked ? "Re-lock" : "Allow Editing"}
      </button>
      {error && <p className="text-label-sm text-error">{error}</p>}
    </div>
  );
}
