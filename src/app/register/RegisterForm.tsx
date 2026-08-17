"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/firebase/config";
import { validatePassword } from "@/lib/password";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-messages";
import { PasswordInput } from "@/components/PasswordInput";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";

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

  async function postLogin(idToken: string) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, provider: "google" }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setErrors({ form: data.error ?? "Something went wrong. Please try again." });
      return;
    }

    router.push("/");
    router.refresh();
  }

  const { googleSubmitting, handleGoogleSignIn } = useGoogleSignIn({
    onSuccess: postLogin,
    clearError: () => setErrors({}),
    setError: (message) => setErrors({ form: message }),
  });

  function handlePasswordChange(value: string) {
    setPassword(value);
    const passwordErrors = validatePassword(value);
    setErrors((prev) => ({ ...prev, password: value ? passwordErrors[0] : undefined }));
  }

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
      let user;
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: `${firstName} ${lastName}` });
        user = credential.user;
      } catch (createError) {
        const code = (createError as { code?: string } | null)?.code;
        if (code !== "auth/email-already-in-use") throw createError;

        // An account already exists for this email. This is either someone
        // else's account, or it's this same person retrying after a partial
        // failure earlier (Firebase account created, but the database row
        // and/or verification email never completed). Signing in with the
        // password they just typed distinguishes the two — only the actual
        // owner's password succeeds, so this can never be used to probe
        // whether an email is registered. (fetchSignInMethodsForEmail is
        // deliberately not used as the gate here: Firebase's Email
        // Enumeration Protection setting, on by default for newer projects,
        // makes it always return an empty array regardless of whether the
        // account exists, which would silently skip this recovery path.)
        let signInCredential;
        try {
          signInCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch {
          const methods = await fetchSignInMethodsForEmail(auth, email).catch(() => [] as string[]);
          if (methods.includes("google.com") && !methods.includes("password")) {
            setErrors({
              email: "This email is already registered with Google. Please continue with Google instead.",
            });
          } else {
            setErrors({ email: "An account with this email already exists." });
          }
          return;
        }

        if (signInCredential.user.emailVerified) {
          // Fully registered and verified already — not a partial failure,
          // just an existing account. Don't sign them in.
          await auth.signOut();
          setErrors({ email: "An account with this email already exists." });
          return;
        }
        user = signInCredential.user;
      }

      const idToken = await user.getIdToken();
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

      const verificationResponse = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!verificationResponse.ok) {
        const data = await verificationResponse.json().catch(() => ({}));
        setErrors({
          form:
            data.error ??
            "Your account was created, but we couldn't send the verification email. You can request a new one from the next screen.",
        });
      }

      router.push("/verify-email");
    } catch (error) {
      setErrors({ form: getFirebaseErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {errors.form && (
        <p
          role="alert"
          aria-live="assertive"
          className="mb-6 text-label-md text-error bg-error-container text-on-error-container rounded-lg px-4 py-3"
        >
          {errors.form}
        </p>
      )}

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={submitting || googleSubmitting}
        className="w-full h-12 flex items-center justify-center gap-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
          />
        </svg>
        <span className="text-label-md text-on-surface">
          {googleSubmitting ? "Signing up..." : "Continue with Google"}
        </span>
      </button>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-outline-variant" />
        </div>
        <div className="relative flex justify-center text-label-sm">
          <span className="bg-surface-container-lowest px-4 text-on-surface-variant">
            Or continue with email
          </span>
        </div>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-label-md text-on-surface-variant block" htmlFor="firstName">
            First Name
          </label>
          <input
            id="firstName"
            autoComplete="given-name"
            className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          {errors.firstName && <p role="alert" aria-live="assertive" className="text-label-sm text-error">{errors.firstName}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-label-md text-on-surface-variant block" htmlFor="lastName">
            Last Name
          </label>
          <input
            id="lastName"
            autoComplete="family-name"
            className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          {errors.lastName && <p role="alert" aria-live="assertive" className="text-label-sm text-error">{errors.lastName}</p>}
        </div>
      </div>

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
        {errors.email && <p role="alert" aria-live="assertive" className="text-label-sm text-error">{errors.email}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-label-md text-on-surface-variant block" htmlFor="password">
          Password
        </label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          placeholder="••••••••"
          className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
        />
        {errors.password && <p role="alert" aria-live="assertive" className="text-label-sm text-error">{errors.password}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-label-md text-on-surface-variant block" htmlFor="confirmPassword">
          Confirm Password
        </label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {errors.confirmPassword && <p role="alert" aria-live="assertive" className="text-label-sm text-error">{errors.confirmPassword}</p>}
      </div>

      <div className="space-y-1">
        <label className="flex items-start gap-2 text-label-md text-on-surface-variant cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 cursor-pointer"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          <span>
            I agree to the{" "}
            <a className="text-primary font-bold hover:underline" href="/terms-of-service" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>{" "}
            and{" "}
            <a className="text-primary font-bold hover:underline" href="/privacy-policy" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
            .
          </span>
        </label>
        {errors.terms && <p role="alert" aria-live="assertive" className="text-label-sm text-error">{errors.terms}</p>}
      </div>

      <button
        type="submit"
        disabled={submitting || googleSubmitting}
        className="w-full h-12 bg-primary text-on-primary text-body-md font-bold rounded-lg hover:bg-secondary hover:text-on-secondary transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "Creating account..." : "Create Account"}
      </button>
      </form>
    </div>
  );
}
