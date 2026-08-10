"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/firebase/config";
import { validatePassword, PASSWORD_REQUIREMENTS_HINT } from "@/lib/password";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-messages";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  form?: string;
};

export function RegisterForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});

    const nextErrors: FieldErrors = {};
    if (!firstName.trim()) nextErrors.firstName = "First name is required.";
    if (!lastName.trim()) nextErrors.lastName = "Last name is required.";
    if (!EMAIL_REGEX.test(email)) nextErrors.email = "Please enter a valid email address.";

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) nextErrors.password = passwordErrors[0];
    if (password !== confirmPassword) nextErrors.confirmPassword = "Passwords do not match.";
    if (!termsAccepted) nextErrors.terms = "You must accept the terms to continue.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const existingMethods = await fetchSignInMethodsForEmail(auth, email);
      if (existingMethods.length > 0) {
        setErrors({ email: "An account with this email already exists." });
        return;
      }

      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: `${firstName} ${lastName}` });

      const idToken = await credential.user.getIdToken();
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, firstName, lastName }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErrors({ form: data.error ?? "Something went wrong. Please try again." });
        return;
      }

      await sendEmailVerification(credential.user);
      router.push("/verify-email");
    } catch (error) {
      setErrors({ form: getFirebaseErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {errors.form && (
        <p className="text-label-md text-error bg-error-container text-on-error-container rounded-lg px-4 py-3">
          {errors.form}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-label-md text-on-surface-variant block" htmlFor="firstName">
            First Name
          </label>
          <input
            id="firstName"
            className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          {errors.firstName && <p className="text-label-sm text-error">{errors.firstName}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-label-md text-on-surface-variant block" htmlFor="lastName">
            Last Name
          </label>
          <input
            id="lastName"
            className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          {errors.lastName && <p className="text-label-sm text-error">{errors.lastName}</p>}
        </div>
      </div>

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
        {errors.email && <p className="text-label-sm text-error">{errors.email}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-label-md text-on-surface-variant block" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          placeholder="••••••••"
          className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {errors.password ? (
          <p className="text-label-sm text-error">{errors.password}</p>
        ) : (
          <p className="text-label-sm text-on-surface-variant">{PASSWORD_REQUIREMENTS_HINT}</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-label-md text-on-surface-variant block" htmlFor="confirmPassword">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {errors.confirmPassword && <p className="text-label-sm text-error">{errors.confirmPassword}</p>}
      </div>

      <div className="space-y-1">
        <label className="flex items-start gap-2 text-label-md text-on-surface-variant">
          <input
            type="checkbox"
            className="mt-1"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          <span>I agree to the Terms of Service and Privacy Policy.</span>
        </label>
        {errors.terms && <p className="text-label-sm text-error">{errors.terms}</p>}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full h-12 bg-primary text-on-primary text-body-md font-bold rounded-lg hover:bg-secondary hover:text-on-secondary transition-all disabled:opacity-60"
      >
        {submitting ? "Creating account..." : "Create Account"}
      </button>
    </form>
  );
}
