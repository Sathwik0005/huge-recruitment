"use client";

interface LockedToastProps {
  message: string | null;
  icon?: string;
}

/**
 * Fixed top-right toast. Originally just for "you tapped a locked field",
 * now the shared toast for any transient wizard notice (locked-field taps,
 * blocking-validation notices like a missing avatar/signature) so those
 * don't rely on an easy-to-miss inline banner — pass a different `icon` to
 * match the message (defaults to "lock").
 */
export function LockedToast({ message, icon = "lock" }: LockedToastProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 z-[70] max-w-xs bg-candidate-navy-dark text-white text-label-sm rounded-lg px-4 py-3 shadow-lg flex items-start gap-2 transition-opacity"
    >
      <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden="true">
        {icon}
      </span>
      <span>{message}</span>
    </div>
  );
}
