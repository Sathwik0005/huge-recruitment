"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HeroSearch() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("keyword", keyword.trim());
    if (location.trim()) params.set("location", location.trim());
    const query = params.toString();
    router.push(query ? `/jobs?${query}` : "/jobs");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded p-2 flex flex-col md:flex-row gap-2 shadow-xl hero-fade-in"
      style={{ animationDelay: "200ms" }}
    >
      <div className="flex-1 relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/40">
          search
        </span>
        <input
          className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded focus:ring-2 focus:ring-primary/10 text-on-surface"
          placeholder="Job Title or Keywords"
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>
      <div className="flex-1 relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/40">
          location_on
        </span>
        <input
          className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded focus:ring-2 focus:ring-primary/10 text-on-surface"
          placeholder="Location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="bg-primary text-white px-12 py-4 rounded font-bold hover:opacity-90 transition-all"
      >
        Search Jobs
      </button>
    </form>
  );
}
