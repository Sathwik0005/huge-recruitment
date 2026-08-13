"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ApplicationStatus } from "@/generated/prisma/enums";
import { updateApplicationStatus } from "./actions";

const STATUS_VALUES = Object.values(ApplicationStatus);

export function ApplicationStatusSelect({ applicationId, status }: { applicationId: string; status: ApplicationStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleChange(value: ApplicationStatus) {
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
        onChange={(e) => handleChange(e.target.value as ApplicationStatus)}
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
