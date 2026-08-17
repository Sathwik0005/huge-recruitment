"use client";

import { useState, type FormEvent } from "react";

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for that email address, we've sent a password reset link. Please check your inbox and spam folder.";

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
      // The server always responds the same way whether or not an account
      // exists for this email — anti-enumeration is enforced there, so the
      // client always shows the generic success state on any response
      // (including a network failure) rather than distinguishing outcomes.
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Fall through to the same generic success state below.
    } finally {
      setSubmitting(false);
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <p role="status" aria-live="polite" className="text-body-md text-on-surface-variant text-center">
        {GENERIC_SUCCESS_MESSAGE}
      </p>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="text-label-md text-error bg-error-container text-on-error-container rounded-lg px-4 py-3"
        >
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
          autoComplete="email"
          placeholder="e.g. james.smith@corporate.com"
          className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full h-12 bg-primary text-on-primary text-body-md font-bold rounded-lg hover:bg-secondary hover:text-on-secondary transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "Sending..." : "Send Reset Link"}
      </button>
    </form>
  );
}
