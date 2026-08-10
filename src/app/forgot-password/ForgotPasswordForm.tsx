"use client";

import { useState, type FormEvent } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/firebase/config";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-messages";

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for that email, we've sent a password reset link. Check your inbox.";

const ANTI_ENUMERATION_CODES = new Set(["auth/user-not-found", "auth/invalid-credential"]);

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email) {
      setError("Email is required.");
      return;
    }

    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code && ANTI_ENUMERATION_CODES.has(code)) {
        setSuccess(true);
      } else {
        setError(getFirebaseErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return <p className="text-body-md text-on-surface-variant text-center">{GENERIC_SUCCESS_MESSAGE}</p>;
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {error && (
        <p className="text-label-md text-error bg-error-container text-on-error-container rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="space-y-1">
        <label className="text-label-md text-on-surface-variant block" htmlFor="email">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          placeholder="e.g. james.smith@corporate.com"
          className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full h-12 bg-primary text-on-primary text-body-md font-bold rounded-lg hover:bg-secondary hover:text-on-secondary transition-all disabled:opacity-60"
      >
        {submitting ? "Sending..." : "Send Reset Link"}
      </button>
    </form>
  );
}
