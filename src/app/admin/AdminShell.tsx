"use client";

import { useState, type ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

type AdminShellProps = {
  user: { firstName: string; email: string };
  children: ReactNode;
};

export function AdminShell({ user, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar user={user} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar user={user} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-margin-mobile md:p-margin-desktop">{children}</main>
      </div>
    </div>
  );
}
