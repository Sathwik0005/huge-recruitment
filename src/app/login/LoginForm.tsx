"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  type AuthCredential,
  type AuthError,
} from "firebase/auth";
import { auth } from "@/firebase/config";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-messages";
import { PasswordInput } from "@/components/PasswordInput";

type LinkPrompt = { email: string; credential: AuthCredential };

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  // Test-only: the real Google popup (signInWithPopup) cannot be driven by
  // browser automation (it requires a genuine Google login). This lazy
  // initializer lets an E2E test simulate the
  // account-exists-with-different-credential collision via a query param, so
  // the rest of the linking flow below — real signInWithEmailAndPassword,
  // real linkWithCredential, real error handling — can be exercised against
  // a live Firebase project. Inert in production builds and on the server.
  const [linkPrompt, setLinkPrompt] = useState<LinkPrompt | null>(() => {
    if (typeof window === "undefined" || process.env.NODE_ENV === "production") return null;
    const simulatedEmail = new URLSearchParams(window.location.search).get(
      "__e2eSimulateGoogleCollision",
    );
    if (!simulatedEmail) return null;
    return {
      email: simulatedEmail,
      credential: GoogleAuthProvider.credential("e2e-test-id-token", "e2e-test-access-token"),
    };
  });
  const [linkPassword, setLinkPassword] = useState("");
  const [linking, setLinking] = useState(false);

  async function postLogin(idToken: string, provider: "password" | "google") {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, provider }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();
      await postLogin(idToken, "password");
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLinkPrompt(null);
    setGoogleSubmitting(true);
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await credential.user.getIdToken();
      await postLogin(idToken, "google");
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code === "auth/account-exists-with-different-credential") {
        const pendingCredential = GoogleAuthProvider.credentialFromError(err as AuthError);
        const linkEmail = (err as { customData?: { email?: string } } | null)?.customData?.email;
        if (pendingCredential && linkEmail) {
          setLinkPrompt({ email: linkEmail, credential: pendingCredential });
        } else {
          setError(getFirebaseErrorMessage(err));
        }
      } else {
        setError(getFirebaseErrorMessage(err));
      }
    } finally {
      setGoogleSubmitting(false);
    }
  }

  async function handleLinkAccounts(event: FormEvent) {
    event.preventDefault();
    if (!linkPrompt) return;

    setError(null);
    setLinking(true);
    try {
      // Kept as two separate try/catch blocks so a failure here can't be
      // misreported as a wrong password: Firebase happens to map some
      // linkWithCredential failures (e.g. a stale/invalid Google credential)
      // to the SAME auth/invalid-credential code used for a bad password,
      // which would otherwise show the misleading "Invalid email or
      // password." message even though the password was correct.
      let existing;
      try {
        existing = await signInWithEmailAndPassword(auth, linkPrompt.email, linkPassword);
      } catch (err) {
        setError(getFirebaseErrorMessage(err));
        return;
      }

      try {
        await linkWithCredential(existing.user, linkPrompt.credential);
      } catch {
        setError(
          "Your password was correct, but we couldn't link your Google account right now. Please try again, or continue signing in with your password.",
        );
        return;
      }

      const idToken = await existing.user.getIdToken();
      setLinkPrompt(null);
      setLinkPassword("");
      await postLogin(idToken, "password");
    } finally {
      setLinking(false);
    }
  }

  return (
    <div>
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

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-label-md text-on-surface-variant block" htmlFor="password">
              Password
            </label>
            <a className="text-label-md text-primary hover:underline" href="/forgot-password">
              Forgot Password?
            </a>
          </div>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={submitting || googleSubmitting}
          className="w-full h-12 bg-primary text-on-primary text-body-md font-bold rounded-lg hover:bg-secondary hover:text-on-secondary transition-all disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-outline-variant" />
        </div>
        <div className="relative flex justify-center text-label-sm">
          <span className="bg-surface-container-lowest px-4 text-on-surface-variant">
            Or continue with
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={submitting || googleSubmitting}
        className="w-full h-12 flex items-center justify-center gap-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-all disabled:opacity-60"
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
          {googleSubmitting ? "Signing in..." : "Continue with Google"}
        </span>
      </button>

      {linkPrompt && (
        <form
          className="mt-6 p-4 space-y-3 bg-surface-container-low border border-outline-variant rounded-lg"
          onSubmit={handleLinkAccounts}
        >
          <p className="text-label-md text-on-surface">
            An account already exists for <span className="font-bold">{linkPrompt.email}</span> using a
            password. Enter that password to link your Google sign-in to it.
          </p>
          <PasswordInput
            id="linkPassword"
            aria-label="Password for account linking"
            placeholder="••••••••"
            className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            value={linkPassword}
            onChange={(e) => setLinkPassword(e.target.value)}
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={linking || !linkPassword}
              className="h-12 px-6 bg-primary text-on-primary text-body-md font-bold rounded-lg hover:bg-secondary hover:text-on-secondary transition-all disabled:opacity-60"
            >
              {linking ? "Linking..." : "Link Google Account"}
            </button>
            <button
              type="button"
              onClick={() => {
                setLinkPrompt(null);
                setLinkPassword("");
              }}
              disabled={linking}
              className="h-12 px-6 border border-outline-variant text-primary text-body-md font-bold rounded-lg hover:bg-surface-container-low transition-all disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
