import "server-only";

export type FirebaseActionMode = "verifyEmail" | "resetPassword";

const ALLOWED_MODES: ReadonlySet<string> = new Set(["verifyEmail", "resetPassword"]);
const FORWARDED_PARAMS = ["mode", "oobCode", "apiKey", "continueUrl", "lang", "tenantId"] as const;
const FIREBASE_ACTION_PATH = "/__/auth/action";

/**
 * Firebase Admin's generateEmailVerificationLink/generatePasswordResetLink
 * return a link to Firebase's own hosted action-handler page
 * (https://{authDomain}/__/auth/action?mode=...&oobCode=...). This rewrites
 * only the destination to our own /auth/action router, carrying the
 * Firebase-issued oobCode/apiKey/etc. forward unchanged — the oobCode itself
 * is still minted, expired and validated entirely by Firebase.
 */
export function toAppActionLink(firebaseLink: string, expectedMode: FirebaseActionMode): string {
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!authDomain) throw new Error("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is not configured");
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not configured");

  let parsed: URL;
  try {
    parsed = new URL(firebaseLink);
  } catch {
    throw new Error("Malformed Firebase action link");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Firebase action link must use HTTPS");
  }
  if (parsed.host !== authDomain) {
    throw new Error("Unexpected Firebase action link origin");
  }
  if (parsed.pathname !== FIREBASE_ACTION_PATH) {
    throw new Error("Unexpected Firebase action link path");
  }

  const mode = parsed.searchParams.get("mode");
  const oobCode = parsed.searchParams.get("oobCode");
  const apiKey = parsed.searchParams.get("apiKey");

  if (!mode || !ALLOWED_MODES.has(mode)) {
    throw new Error("Unrecognised or missing action mode on Firebase action link");
  }
  if (mode !== expectedMode) {
    throw new Error(`Firebase action link mode "${mode}" does not match expected mode "${expectedMode}"`);
  }
  if (!oobCode) {
    throw new Error("Missing oobCode on Firebase action link");
  }
  if (!apiKey) {
    throw new Error("Missing apiKey on Firebase action link");
  }

  const forwarded = new URLSearchParams();
  for (const key of FORWARDED_PARAMS) {
    const value = parsed.searchParams.get(key);
    if (value) forwarded.set(key, value);
  }

  const destination = new URL("/auth/action", appUrl);
  destination.search = forwarded.toString();
  return destination.toString();
}
