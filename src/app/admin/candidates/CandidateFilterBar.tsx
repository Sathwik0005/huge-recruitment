"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

type SectorOption = { id: string; label: string };

const VERIFICATION_OPTIONS: { value: "verified" | "pending" | "inactive"; label: string }[] = [
  { value: "verified", label: "Verified" },
  { value: "pending", label: "Pending" },
  { value: "inactive", label: "Inactive" },
];

export function CandidateFilterBar({ sectors }: { sectors: SectorOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function applyFilters(overrides: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(overrides)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    const qs = next.toString();
    router.push(qs ? `/admin/candidates?${qs}` : "/admin/candidates");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    applyFilters({ search: search.trim() || undefined });
  }

  function handleClear() {
    setSearch("");
    router.push("/admin/candidates");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-outline-variant bg-surface p-4 flex flex-col md:flex-row gap-4 items-end md:items-center"
    >
      <div className="flex-1 w-full md:w-auto space-y-1">
        <label className="block text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="candidate-search">
          Search
        </label>
        <input
          id="candidate-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full h-11 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md"
        />
      </div>
      <div className="w-full md:w-48 space-y-1">
        <label className="block text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="candidate-sector">
          Sector
        </label>
        <select
          id="candidate-sector"
          defaultValue={searchParams.get("sectorId") ?? ""}
          onChange={(e) => applyFilters({ sectorId: e.target.value || undefined })}
          className="w-full h-11 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md"
        >
          <option value="">All Sectors</option>
          {sectors.map((sector) => (
            <option key={sector.id} value={sector.id}>
              {sector.label}
            </option>
          ))}
        </select>
      </div>
      <div className="w-full md:w-48 space-y-1">
        <label className="block text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="candidate-status">
          Status
        </label>
        <select
          id="candidate-status"
          defaultValue={searchParams.get("verification") ?? ""}
          onChange={(e) => applyFilters({ verification: e.target.value || undefined })}
          className="w-full h-11 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md"
        >
          <option value="">All Statuses</option>
          {VERIFICATION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 w-full md:w-auto">
        <button type="submit" className="h-11 px-5 rounded-lg border border-primary text-primary font-bold flex-1 md:flex-none">
          Search
        </button>
        <button type="button" onClick={handleClear} className="h-11 px-4 text-primary font-bold hover:bg-surface-container rounded-lg">
          Clear
        </button>
      </div>
    </form>
  );
}
