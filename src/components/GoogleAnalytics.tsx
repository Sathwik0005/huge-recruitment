"use client";

import Script from "next/script";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useConsent } from "@/components/ConsentProvider";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * gtag.js itself is only ever injected once consent is granted AND a
 * measurement ID is configured. The Consent Mode default (denied) script
 * lives directly in the root layout (next/script's `beforeInteractive`
 * strategy is only supported there), establishing the denied posture before
 * anything in this component can run.
 */
export default function GoogleAnalytics() {
  const { consent } = useConsent();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const analyticsEnabled = consent === "granted" && Boolean(GA_MEASUREMENT_ID);

  useEffect(() => {
    if (!analyticsEnabled || typeof window.gtag !== "function") return;
    const query = searchParams.toString();
    window.gtag("event", "page_view", { page_path: query ? `${pathname}?${query}` : pathname });
  }, [analyticsEnabled, pathname, searchParams]);

  return (
    <>
      {analyticsEnabled && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              gtag('consent', 'update', { analytics_storage: 'granted' });
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
            `}
          </Script>
        </>
      )}
    </>
  );
}
