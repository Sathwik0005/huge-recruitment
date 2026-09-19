"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export function CandidateProfileSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    const trimmed = search.trim();
    if (trimmed) next.set("search", trimmed);
    else next.delete("search");
    next.delete("page");
    const qs = next.toString();
    router.push(qs ? `/admin/candidate-profiles?${qs}` : "/admin/candidate-profiles");
  }

  function handleClear() {
    setSearch("");
    router.push("/admin/candidate-profiles");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-outline-variant bg-surface p-4 flex flex-col md:flex-row gap-4 items-end md:items-center"
    >
      <div className="flex-1 w-full md:w-auto space-y-1">
        <label className="block text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="candidate-profile-search">
          Search
        </label>
        <input
          id="candidate-profile-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full h-11 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md"
        />
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
