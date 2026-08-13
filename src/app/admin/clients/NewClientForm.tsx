"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "./actions";

export function NewClientForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Employer name is required.");
      return;
    }

    startTransition(async () => {
      const result = await createClient(trimmed);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setName("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-outline-variant bg-surface p-4 flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px] space-y-1">
        <label className="text-label-md text-on-surface-variant block" htmlFor="new-client-name">
          New employer name
        </label>
        <input
          id="new-client-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={pending}
          className="h-11 px-4 w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-11 px-6 bg-primary text-on-primary text-label-md font-bold rounded-lg hover:bg-secondary hover:text-on-secondary transition-all disabled:opacity-60"
      >
        {pending ? "Adding..." : "Add employer"}
      </button>
      {error && <p className="text-label-sm text-error w-full">{error}</p>}
    </form>
  );
}
