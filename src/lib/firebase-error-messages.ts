const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Password is too weak. Please choose a stronger password.",
  "auth/network-request-failed": "Network error. Please check your connection and try again.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/invalid-credential": "Invalid email or password.",
  "auth/wrong-password": "Invalid email or password.",
  "auth/user-not-found": "Invalid email or password.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/popup-closed-by-user": "Google sign-in was cancelled.",
  "auth/cancelled-popup-request": "Google sign-in was cancelled.",
  "auth/account-exists-with-different-credential":
    "An account with this email already exists using a different sign-in method.",
  "auth/unauthorized-domain":
    "Google sign-in isn't enabled for this domain yet. Please contact support.",
  "auth/popup-blocked": "Your browser blocked the Google sign-in popup. Please allow popups and try again.",
  "auth/expired-action-code": "This link has expired. Please request a new one.",
  "auth/invalid-action-code": "This link is invalid or has already been used. Please request a new one.",
  "auth/user-disabled": "This account has been disabled. Please contact support.",
  "auth/requires-recent-login": "For your security, please sign in again before continuing.",
};

const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

export function getFirebaseErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code && code in FIREBASE_ERROR_MESSAGES) return FIREBASE_ERROR_MESSAGES[code];
  return DEFAULT_MESSAGE;
}
