import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SiteChrome from "@/components/SiteChrome";
import { ConsentProvider } from "@/components/ConsentProvider";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import MaterialSymbolsFont, { MATERIAL_SYMBOLS_HREF } from "@/components/MaterialSymbolsFont";
import { getSiteUrl } from "@/lib/site-url";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/lib/organization-json-ld";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
});

const SITE_NAME = "Huge Recruitment";
const SITE_DESCRIPTION = "Elevate your career with specialist guidance";
const THEME_COLOR = "#022448";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: THEME_COLOR,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const organizationJsonLd = buildOrganizationJsonLd();
  const websiteJsonLd = buildWebsiteJsonLd();

  return (
    <html lang="en" className={`${hankenGrotesk.variable} h-full antialiased`}>
      <head>
        <noscript>
          <link rel="stylesheet" href={MATERIAL_SYMBOLS_HREF} />
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {/*
          Google Consent Mode v2 default (denied) — must run before gtag.js
          could ever load. next/script's `beforeInteractive` strategy is only
          supported directly in the root layout, not in a nested component.
        */}
        <Script id="consent-mode-default" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied'
            });
          `}
        </Script>
        <MaterialSymbolsFont />
        <ConsentProvider>
          <Suspense fallback={null}>
            <GoogleAnalytics />
          </Suspense>
          <SiteChrome header={<Header />} footer={<Footer />}>
            {children}
          </SiteChrome>
          <CookieConsentBanner />
        </ConsentProvider>
      </body>
    </html>
  );
}
