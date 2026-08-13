export function AdminInitialAvatar({ firstName, className }: { firstName: string; className?: string }) {
  const initial = firstName.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center rounded-full bg-primary text-on-primary font-bold ${className ?? ""}`}
    >
      {initial}
    </div>
  );
}
