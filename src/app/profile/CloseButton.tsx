"use client";

import { useRouter } from "next/navigation";

export function CloseButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Close and go back"
      className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
    >
      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
        close
      </span>
    </button>
  );
}
