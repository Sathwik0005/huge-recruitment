"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

const INTERACTIVE_SELECTOR = "a, button, select, input, textarea, label";

/** A <tr> that navigates to `href` when clicked, except when the click lands on an interactive child. */
export function ClickableRow({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();

  return (
    <tr
      onClick={(event) => {
        if ((event.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return;
        router.push(href);
      }}
      className={`cursor-pointer ${className ?? ""}`}
    >
      {children}
    </tr>
  );
}
