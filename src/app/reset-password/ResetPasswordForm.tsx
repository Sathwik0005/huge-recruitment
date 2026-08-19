"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/firebase/config";
import { validatePassword, PASSWORD_REQUIREMENTS_HINT } from "@/lib/password";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-messages";
import { PasswordInput } from "@/components/PasswordInput";

type CodeStatus = "checking" | "valid" | "invalid";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");

  const [codeStatus, setCodeStatus] = useState<CodeStatus>(() => (oobCode ? "checking" : "invalid"));
  const [codeError, setCodeError] = useState<string | null>(() =>
    oobCode ? null : "This password reset link is missing required information. Please request a new one.",
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!oobCode) return;

    let cancelled = false;
    verifyPasswordResetCode(auth, oobCode)
      .then(() => {
        if (!cancelled) setCodeStatus("valid");
      })
      .catch((err) => {
        if (!cancelled) {
          setCodeStatus("invalid");
          setCodeError(getFirebaseErrorMessage(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [oobCode]);

  function handlePasswordChange(value: string) {
    setPassword(value);
    const errors = validatePassword(value);
    setPasswordError(value && errors.length > 0 ? errors[0] : null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!oobCode || submitting) return;

    setFormError(null);
    setConfirmError(null);

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setPasswordError(passwordErrors[0]);
      return;
    }
    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      router.replace("/login?passwordReset=true");
    } catch (err) {
      setFormError(getFirebaseErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (codeStatus === "checking") {
    return (
      <p role="status" aria-live="polite" className="text-body-md text-on-surface-variant text-center">
        Checking your reset link...
      </p>
    );
  }

  if (codeStatus === "invalid") {
    return (
      <div className="text-center space-y-4">
        <p role="alert" aria-live="assertive" className="text-label-md text-error bg-error-container text-on-error-container rounded-lg px-4 py-3">
          {codeError}
        </p>
        <p className="text-body-md text-secondary">
          <a className="text-primary font-bold hover:underline" href="/forgot-password">
            Request a new password reset link
          </a>
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {formError && (
        <p role="alert" aria-live="assertive" className="text-label-md text-error bg-error-container text-on-error-container rounded-lg px-4 py-3">
          {formError}
        </p>
      )}

      <div className="space-y-1">
        <label className="text-label-md text-on-surface-variant block" htmlFor="password">
          New Password
        </label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          placeholder="••••••••"
          className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
        />
        {passwordError ? (
          <p role="alert" aria-live="assertive" className="text-label-sm text-error">{passwordError}</p>
        ) : (
          <p className="text-label-sm text-on-surface-variant">{PASSWORD_REQUIREMENTS_HINT}</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-label-md text-on-surface-variant block" htmlFor="confirmPassword">
          Confirm New Password
        </label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {confirmError && <p role="alert" aria-live="assertive" className="text-label-sm text-error">{confirmError}</p>}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full h-12 bg-primary text-on-primary text-body-md font-bold rounded-lg hover:bg-secondary hover:text-on-secondary transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "Resetting password..." : "Reset Password"}
      </button>
    </form>
  );
}