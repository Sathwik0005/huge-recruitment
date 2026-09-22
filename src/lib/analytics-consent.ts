export const CONSENT_COOKIE_NAME = "ga_consent";
const CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

export type ConsentChoice = "granted" | "denied";

/** `null` means the visitor hasn't been asked yet (or JS/cookies are unavailable). */
export function getStoredConsent(): ConsentChoice | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE_NAME}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return value === "granted" || value === "denied" ? value : null;
}

export function setStoredConsent(choice: ConsentChoice): void {
  if (typeof document === "undefined") return;

  document.cookie = `${CONSENT_COOKIE_NAME}=${choice}; path=/; max-age=${CONSENT_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}
