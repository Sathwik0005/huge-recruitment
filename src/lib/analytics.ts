declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * No-ops unless GA4 has actually been loaded (consent granted + a
 * measurement ID configured) and the page isn't under /admin. Never pass
 * PII (names, emails, phone numbers, CV data, tokens) as params.
 */
export function trackEvent(name: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  if (window.location.pathname.startsWith("/admin")) return;

  window.gtag("event", name, params);
}
