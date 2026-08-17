"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applyActionCode, checkActionCode, onAuthStateChanged, reload, type User } from "firebase/auth";
import { auth } from "@/firebase/config";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-messages";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}

function VerifyEmailPageContent() {
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");
  const mode = searchParams.get("mode");

  if (mode === "verifyEmail" && oobCode) {
    return <VerifyEmailActionHandler oobCode={oobCode} />;
  }

  return <CheckEmailState />;
}

function VerifyEmailActionHandler({ oobCode }: { oobCode: string }) {
  const router = useRouter();
  const [state, setState] = useState<"processing" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function completeOnDifferentBrowser(email: string | undefined) {
      if (email) {
        // Best-effort, once-only welcome email — doesn't block the redirect.
        fetch("/api/auth/verification-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }).catch(() => {});
      }
      // No local Firebase session exists here, so there's nothing to mint a
      // secure session from — land on "/" without creating a false session;
      // proxy.ts will route them to /login if the page turns out to need one.
      if (!cancelled) router.replace("/");
    }

    async function run() {
      let email: string | undefined;
      try {
        const info = await checkActionCode(auth, oobCode);
        email = info.data.email ?? undefined;
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(getFirebaseErrorMessage(err));
          setState("error");
        }
        return;
      }

      try {
        await applyActionCode(auth, oobCode);
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(getFirebaseErrorMessage(err));
          setState("error");
        }
        return;
      }

      const currentUser = auth.currentUser;
      const sameBrowser = Boolean(currentUser) && (!email || currentUser?.email === email);

      if (sameBrowser && currentUser) {
        try {
          // Sync the client SDK's cached user with the verification we just
          // applied before reading emailVerified/minting a token from it.
          await reload(currentUser);
          const idToken = await currentUser.getIdToken(true);
          const response = await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
          if (!response.ok) throw new Error("session mint failed");
          if (!cancelled) {
            router.replace("/");
            router.refresh();
          }
          return;
        } catch {
          // Verification itself already succeeded even though minting a
          // session here failed — fall back to the safe different-browser
          // path below rather than leaving the user stuck.
        }
      }

      await completeOnDifferentBrowser(email);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [oobCode, router]);

  return (
    <main className="flex-1 flex items-center justify-center py-4 px-gutter">
      <div className="w-full max-w-[440px]">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-[0_4px_20px_-2px_rgba(2,36,72,0.08)] text-center">
          {state === "processing" ? (
            <>
              <h1 className="text-headline-lg text-primary mb-2">Verifying your email address</h1>
              <p role="status" aria-live="polite" className="text-body-md text-secondary">
                Please wait while we activate your account.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-headline-lg text-primary mb-2">This link isn&apos;t valid</h1>
              <p role="alert" aria-live="assertive" className="mb-6 text-label-md text-error bg-error-container text-on-error-container rounded-lg px-4 py-3">
                {errorMessage}
              </p>
              <div className="flex flex-col gap-2">
                <a href="/login" className="text-primary font-bold hover:underline">
                  Go to login
                </a>
                <a href="/register" className="text-primary font-bold hover:underline">
                  Create a new account
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

/**
 * The "check your email" waiting room shown right after registration (or
 * after an unverified password login redirect). The manual "I've Verified"
 * button is a deliberate fallback, not the primary flow: some email/security
 * scanners pre-fetch links and can consume the one-time action code before
 * the user clicks it, which would make the link-based flow above show an
 * error — but reload() here re-reads Firebase's own server-side truth
 * regardless of how verification happened, so it still works in that case.
 */
function CheckEmailState() {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) router.push("/register");
    });
    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleCheckVerified() {
    if (!auth.currentUser) return;
    setChecking(true);
    setMessage(null);
    try {
      await reload(auth.currentUser);
      if (!auth.currentUser.emailVerified) {
        setMessage("Still not verified — check your inbox or resend the email.");
        return;
      }

      const idToken = await auth.currentUser.getIdToken(true);
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    if (!auth.currentUser || cooldown > 0) return;
    setResending(true);
    setMessage(null);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setCooldown(RESEND_COOLDOWN_SECONDS);
      setMessage("Verification email sent.");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setResending(false);
    }
  }

  if (user === undefined) return null;

  return (
    <main className="flex-1 flex items-center justify-center py-4 px-gutter">
      <div className="w-full max-w-[440px]">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-[0_4px_20px_-2px_rgba(2,36,72,0.08)] text-center">
          <h1 className="text-headline-lg text-primary mb-2">Check your email</h1>
          <p className="text-body-md text-secondary mb-8">
            We sent a verification link to <span className="font-bold">{user?.email}</span>. Click the
            link to activate your account — you&apos;ll be signed in automatically.
          </p>

          {message && (
            <p role="status" aria-live="polite" className="text-label-md text-on-surface-variant mb-4">
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="w-full h-12 bg-primary text-on-primary text-body-md font-bold rounded-lg hover:bg-secondary hover:text-on-secondary transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {cooldown > 0 ? `Resend available in ${cooldown}s` : resending ? "Sending..." : "Resend Email"}
          </button>

          <button
            type="button"
            onClick={handleCheckVerified}
            disabled={checking}
            className="w-full h-12 mt-4 border border-outline-variant text-primary text-body-md font-bold rounded-lg hover:bg-surface-container-low transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {checking ? "Checking..." : "I've already verified"}
          </button>
        </div>
      </div>
    </main>
  );
}
