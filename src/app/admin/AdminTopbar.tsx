"use client";

import { AdminInitialAvatar } from "@/lib/admin-avatar";
import { NotificationsBell } from "./NotificationsBell";

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

      <div className="flex items-center gap-4 ml-auto pl-4 shrink-0">
        <NotificationsBell />
        <div className="hidden sm:flex items-center gap-2">
          <AdminInitialAvatar firstName={user.firstName} className="w-8 h-8 shrink-0" />
          <span className="text-label-md text-on-surface-variant">{user.firstName}</span>
        </div>
      </div>
    </header>
  );
}
