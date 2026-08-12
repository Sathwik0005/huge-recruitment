"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishJob, pauseJob, closeJob, archiveJob, restoreToDraft } from "./actions";

type JobStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "CLOSED" | "ARCHIVED";

const TRANSITIONS: Record<
  JobStatus,
  { label: string; action: (jobId: string) => Promise<{ success: boolean; error?: string }>; confirm?: string }[]
> = {
  DRAFT: [{ label: "Publish", action: publishJob }],
  PUBLISHED: [
    { label: "Pause", action: pauseJob },
    { label: "Close", action: closeJob, confirm: "Close this job? It will stop accepting applications." },
    { label: "Archive", action: archiveJob, confirm: "Archive this job? This cannot be undone." },
  ],
  PAUSED: [
    { label: "Publish", action: publishJob },
    { label: "Close", action: closeJob, confirm: "Close this job? It will stop accepting applications." },
    { label: "Archive", action: archiveJob, confirm: "Archive this job? This cannot be undone." },
    { label: "Restore to draft", action: restoreToDraft },
  ],
  CLOSED: [
    { label: "Archive", action: archiveJob, confirm: "Archive this job? This cannot be undone." },
    { label: "Restore to draft", action: restoreToDraft },
  ],
  ARCHIVED: [],
};

export function JobStatusActions({ jobId, status }: { jobId: string; status: JobStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const options = TRANSITIONS[status];

  function handleClick(option: (typeof options)[number]) {
    if (option.confirm && !window.confirm(option.confirm)) return;
    setError(undefined);
    startTransition(async () => {
      const result = await option.action(jobId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (options.length === 0) {
    return <p className="text-label-sm text-on-surface-variant">No further actions — this job is archived.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            disabled={pending}
            onClick={() => handleClick(option)}
            className="h-10 px-4 rounded-lg border border-primary text-primary text-label-md font-bold hover:bg-primary hover:text-on-primary transition-all disabled:opacity-60"
          >
            {option.label}
          </button>
        ))}
      </div>
      {error && <p className="text-label-sm text-error">{error}</p>}
    </div>
  );
}
