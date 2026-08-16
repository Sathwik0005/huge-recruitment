"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NO_CHROME_PATHS = new Set(["/login", "/register", "/forgot-password", "/verify-email", "/reset-password"]);

interface SiteChromeProps {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

export default function SiteChrome({ header, footer, children }: SiteChromeProps) {
  const pathname = usePathname();

  if (NO_CHROME_PATHS.has(pathname) || pathname.startsWith("/admin")) {
    return <div className="flex-1 flex flex-col min-h-screen">{children}</div>;
  }

  return (
    <>
      {header}
      <div className="flex-1 flex flex-col pt-20">{children}</div>
      {footer}
    </>
  );
}
