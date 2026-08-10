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
};

const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

export function getFirebaseErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code && code in FIREBASE_ERROR_MESSAGES) return FIREBASE_ERROR_MESSAGES[code];
  return DEFAULT_MESSAGE;
}
