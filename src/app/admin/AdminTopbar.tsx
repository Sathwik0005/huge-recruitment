"use client";

import { AdminInitialAvatar } from "@/lib/admin-avatar";

type AdminTopbarProps = {
  user: { firstName: string; email: string };
  onMenuClick: () => void;
};

export function AdminTopbar({ user, onMenuClick }: AdminTopbarProps) {
  return (
    <header className="flex items-center justify-between px-margin-mobile md:px-margin-desktop w-full h-16 sticky top-0 z-30 bg-background border-b border-outline-variant">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="md:hidden p-2 -ml-2 text-on-surface-variant hover:text-primary mr-2"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          menu
        </span>
      </button>

      <div className="flex-1 flex items-center max-w-xl">
        <div className="relative w-full">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]"
            aria-hidden="true"
          >
            search
          </span>
          <input
            disabled
            title="Search coming soon"
            placeholder="Search coming soon..."
            aria-label="Admin search (coming soon)"
            className="w-full bg-surface-container-low border-b border-outline-variant border-t-0 border-x-0 rounded-t-lg pl-10 pr-4 py-2 text-body-md text-on-surface-variant cursor-not-allowed"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 ml-auto pl-4 shrink-0">
        <span className="p-2 text-on-surface-variant relative" aria-hidden="true">
          <span className="material-symbols-outlined">notifications</span>
        </span>
        <div className="hidden sm:flex items-center gap-2">
          <AdminInitialAvatar firstName={user.firstName} className="w-8 h-8 shrink-0" />
          <span className="text-label-md text-on-surface-variant">{user.firstName}</span>
        </div>
      </div>
    </header>
  );
}
