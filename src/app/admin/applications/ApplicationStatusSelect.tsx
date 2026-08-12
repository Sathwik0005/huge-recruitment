"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateApplicationStatus } from "./actions";

const STATUS_VALUES = ["NEW", "REVIEWING", "SHORTLISTED", "REJECTED", "HIRED", "WITHDRAWN"] as const;

export function ApplicationStatusSelect({
  applicationId,
  status,
}: {
  applicationId: string;
  status: (typeof STATUS_VALUES)[number];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleChange(value: (typeof STATUS_VALUES)[number]) {
    setError(undefined);
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, value);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <select
        value={status}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value as (typeof STATUS_VALUES)[number])}
        className="h-11 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md"
      >
        {STATUS_VALUES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      {error && <p className="text-label-sm text-error">{error}</p>}
    </div>
  );
}
