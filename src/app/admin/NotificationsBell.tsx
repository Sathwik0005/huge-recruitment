"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const POLL_INTERVAL_MS = 60_000;

type AdminNotification = {
  id: string;
  message: string;
  href: string;
  createdAt: string;
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationsBell() {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/notifications");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setItems(data.items ?? []);
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch {
        // Silently ignore — the bell just keeps showing its last known state.
      }
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) setUnreadCount(0);
        }}
        aria-label="Notifications"
        className="p-2 text-on-surface-variant hover:text-primary relative"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-error text-on-error text-[10px] leading-4 text-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest shadow-lg z-50">
          <div className="px-4 py-3 border-b border-outline-variant text-label-md font-bold text-on-surface">
            Recent Activity
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-label-sm text-on-surface-variant text-center">No recent activity.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id} className="border-b border-outline-variant last:border-0">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 hover:bg-surface-container-low transition-colors"
                  >
                    <p className="text-label-md text-on-surface">{item.message}</p>
                    <p className="text-label-sm text-on-surface-variant mt-0.5">{timeAgo(item.createdAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
