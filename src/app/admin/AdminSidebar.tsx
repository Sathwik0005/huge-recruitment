"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminInitialAvatar } from "@/lib/admin-avatar";
import { LogoutButton } from "@/components/LogoutButton";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/candidates", label: "Candidates", icon: "group" },
  { href: "/admin/jobs", label: "Jobs", icon: "work" },
  { href: "/admin/analytics", label: "Analytics", icon: "analytics" },
];

type AdminSidebarProps = {
  user: { firstName: string; email: string };
  mobileOpen: boolean;
  onClose: () => void;
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ user, pathname, onNavigate }: { user: AdminSidebarProps["user"]; pathname: string; onNavigate?: () => void }) {
  return (
    <>
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-on-primary" aria-hidden="true">
            corporate_fare
          </span>
        </div>
        <div>
          <p className="text-headline-md font-bold text-primary leading-tight">RecruitAdmin</p>
          <p className="text-label-sm text-on-surface-variant">Internal Portal</p>
        </div>
      </div>

      <nav aria-label="Admin navigation" className="flex-1 flex flex-col gap-1 overflow-y-auto filters-scrollbar">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={
                active
                  ? "flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-container text-primary font-bold transition-colors"
                  : "flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
              }
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                {item.icon}
              </span>
              <span className="text-label-md">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-outline-variant px-2 space-y-3">
        <div className="flex items-center gap-3">
          <AdminInitialAvatar firstName={user.firstName} className="w-10 h-10 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-label-md text-on-surface font-semibold truncate">{user.firstName}</p>
            <p className="text-label-sm text-on-surface-variant truncate">{user.email}</p>
          </div>
        </div>
        <LogoutButton />
      </div>
    </>
  );
}

export function AdminSidebar({ user, mobileOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col h-screen sticky left-0 top-0 py-6 px-4 w-[var(--spacing-admin-sidebar-w)] bg-surface-container-low border-r border-outline-variant shrink-0">
        <SidebarContent user={user} pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="md:hidden fixed inset-0 z-40 bg-black/40"
        />
      )}
      <aside
        className={`md:hidden fixed left-0 top-0 z-50 flex flex-col h-screen py-6 px-4 w-[var(--spacing-admin-sidebar-w)] bg-surface-container-low border-r border-outline-variant transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent user={user} pathname={pathname} onNavigate={onClose} />
      </aside>
    </>
  );
}
