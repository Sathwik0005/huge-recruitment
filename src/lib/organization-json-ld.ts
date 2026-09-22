import "server-only";
import { getSiteUrl } from "@/lib/site-url";
import { SITE_NAME, LOGO_URL } from "@/lib/brand";

export function buildOrganizationJsonLd() {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: LOGO_URL,
  };
}

export function buildWebsiteJsonLd() {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
  };
}
