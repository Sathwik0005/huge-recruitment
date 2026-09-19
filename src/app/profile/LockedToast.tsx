"use client";

interface LockedToastProps {
  message: string | null;
}

/** Fixed top-right toast shown when the candidate taps/clicks a locked (submitted) field. */
export function LockedToast({ message }: LockedToastProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 z-[70] max-w-xs bg-candidate-navy-dark text-white text-label-sm rounded-lg px-4 py-3 shadow-lg flex items-start gap-2 transition-opacity"
    >
      <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden="true">
        lock
      </span>
      <span>{message}</span>
    </div>
  );
}
