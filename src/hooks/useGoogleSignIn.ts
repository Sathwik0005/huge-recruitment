"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/firebase/config";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-messages";

interface UseGoogleSignInOptions {
  /** Called with a fresh ID token after Google sign-in succeeds. */
  onSuccess: (idToken: string) => Promise<void> | void;
  /** Clears the caller's own error state, matching each form's existing clearing semantics. */
  clearError: () => void;
  /** Sets the caller's own error state to a single message, matching each form's existing error slot. */
  setError: (message: string) => void;
}

/**
 * This project's Firebase/Identity Platform is configured to automatically
 * link a Google sign-in to an existing password account that shares the
 * same verified email (Google's own recommended default) — Google's OAuth
 * already proves ownership of that email, so Firebase merges providers
 * silently rather than throwing auth/account-exists-with-different-credential.
 * That means there is no client-side collision to handle here: any Firebase
 * error (including a genuine collision, should the project setting ever
 * change) is just shown as a mapped error message, not a special linking flow.
 */
export function useGoogleSignIn({ onSuccess, clearError, setError }: UseGoogleSignInOptions) {
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  async function handleGoogleSignIn() {
    clearError();
    setGoogleSubmitting(true);
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await credential.user.getIdToken();
      await onSuccess(idToken);
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setGoogleSubmitting(false);
    }
  }

  return { googleSubmitting, handleGoogleSignIn };
}
