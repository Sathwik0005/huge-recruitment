"use client";

import { useEffect } from "react";

const MATERIAL_SYMBOLS_HREF =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200";

/**
 * Loads the Material Symbols icon-font stylesheet after hydration instead of
 * as a render-blocking <link> in <head>. A <noscript> fallback in the root
 * layout covers no-JS visitors.
 */
export default function MaterialSymbolsFont() {
  useEffect(() => {
    if (document.querySelector(`link[href="${MATERIAL_SYMBOLS_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = MATERIAL_SYMBOLS_HREF;
    document.head.appendChild(link);
  }, []);

  return null;
}

export { MATERIAL_SYMBOLS_HREF };
