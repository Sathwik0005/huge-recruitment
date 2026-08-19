"use client";

import { Suspense, useEffect, useRef, useState } from "react";
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

  return <CheckEmailState initialSendFailed={searchParams.get("sendFailed") === "true"} />;
}

function VerifyEmailActionHandler({ oobCode }: { oobCode: string }) {
  const router = useRouter();
  const [state, setState] = useState<"processing" | "action-error" | "session-error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Guards against a second run() within the same mounted instance (e.g. an
  // effect re-fire) issuing a second applyActionCode() for the same oobCode —
  // that second call would fail with auth/invalid-action-code purely because
  // the first call already consumed it, which is not a real invalid link.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // No "cancelled" flag here deliberately: startedRef above already
    // guarantees this effect's async work runs at most once per real mount.
    // A cancelled-on-cleanup flag combined with that guard is actively
    // harmful in development, where React Strict Mode synchronously mounts,
    // cleans up, and remounts once — the cleanup would flip `cancelled` on
    // the one closure that's actually still running (the remount is skipped
    // by startedRef), silently swallowing the final redirect even though
    // verification and session creation both genuinely succeeded. React 18+
    // safely no-ops state updates after a real unmount, so nothing here
    // needs it.
    function completeOnDifferentBrowser(email: string | undefined) {
      if (email) {
        // Best-effort welcome-email trigger. `keepalive` allows this request
        // to finish while navigation moves the user away from this page.
        void fetch("/api/auth/verification-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
          keepalive: true,
        }).catch(() => {});
      }
      // No local Firebase session exists here, so there's nothing to mint a
      // secure session from — land on "/" without creating a false session;
      // proxy.ts will route them to /login if the page turns out to need one.
      router.replace("/");
    }

    async function createSessionAndGoHome(currentUser: User): Promise<boolean> {
      try {
        const idToken = await currentUser.getIdToken(true);
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setErrorMessage(
            data.error ??
              "Your email is verified, but we couldn't sign you in automatically. Please sign in again.",
          );
          setState("session-error");
          return false;
        }

        router.replace("/");
        router.refresh();
        return true;
      } catch {
        setErrorMessage(
          "Your email is verified, but we couldn't sign you in automatically. Please sign in again.",
        );
        setState("session-error");
        return false;
      }
    }

    // checkActionCode/applyActionCode reject an already-consumed code with
    // the same auth/invalid-action-code error as a genuinely bad one. If
    // this exact browser already has a signed-in Firebase user who turns
    // out to already be verified, the code was consumed by an earlier
    // application (a duplicate click, a re-opened email, a link-scanning
    // proxy) that succeeded — not a failure. Confirming that from Firebase's
    // own record (reload) and completing the session, rather than showing a
    // false "invalid link" error, is what resolves the contradiction where
    // the page said "invalid" but the user was already logged in on refresh.
    async function recoverAlreadyVerifiedUser(err: unknown, expectedEmail: string | undefined) {
      const currentUser = auth.currentUser;
      if (currentUser && (!expectedEmail || currentUser.email === expectedEmail)) {
        try {
          await reload(currentUser);
          if (currentUser.emailVerified) {
            // Firebase has confirmed that verification succeeded. From this
            // point onward, a session problem must never be reported as an
            // invalid verification link.
            await createSessionAndGoHome(currentUser);
            return;
          }
        } catch {
          setErrorMessage(
            "We couldn't confirm your verification status right now. Please try signing in again.",
          );
          setState("session-error");
          return;
        }
      }
      setErrorMessage(getFirebaseErrorMessage(err));
      setState("action-error");
    }

    async function run() {
      try {
        await auth.authStateReady();
      } catch {
        setErrorMessage("We couldn't verify your email right now. Please try again.");
        setState("action-error");
        return;
      }

      let email: string | undefined;
      try {
        const info = await checkActionCode(auth, oobCode);
        email = info.data.email ?? undefined;
      } catch (err) {
        await recoverAlreadyVerifiedUser(err, undefined);
        return;
      }

      try {
        await applyActionCode(auth, oobCode);
      } catch (err) {
        await recoverAlreadyVerifiedUser(err, email);
        return;
      }

      const currentUser = auth.currentUser;
      const sameBrowser = Boolean(currentUser) && (!email || currentUser?.email === email);

      if (sameBrowser && currentUser) {
        try {
          // Sync the client SDK's cached user with the verification we just
          // applied before reading emailVerified/minting a token from it.
          await reload(currentUser);
          await createSessionAndGoHome(currentUser);
          return;
        } catch {
          // Verification already succeeded. Never convert a later reload
          // problem into an "invalid link" error.
          setErrorMessage(
            "Your email is verified, but we couldn't sign you in automatically. Please sign in again.",
          );
          setState("session-error");
          return;
        }
      }

      completeOnDifferentBrowser(email);
    }

    run();
  }, [oobCode, router]);

  return (
    <main className="flex-1 flex items-center justify-center py-4 px-gutter">
      <div className="w-full max-w-[440px]">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-[0_4px_20px_-2px_rgba(2,36,72,0.08)] text-center">
          {state === "processing" ? (
            <>
              <div
                role="status"
                aria-live="polite"
                className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-4 border-outline-variant border-t-primary"
              />
              <h1 className="text-headline-lg text-primary mb-2">Verifying your email address</h1>
              <p className="text-body-md text-secondary">Please wait while we activate your account.</p>
            </>
          ) : state === "action-error" ? (
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
          ) : (
            <>
              <h1 className="text-headline-lg text-primary mb-2">Your email is verified</h1>
              <p role="alert" aria-live="assertive" className="mb-6 text-label-md text-error bg-error-container text-on-error-container rounded-lg px-4 py-3">
                {errorMessage}
              </p>
              <a href="/login" className="text-primary font-bold hover:underline">
                Go to login
              </a>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

/**
 * The "check your email" waiting room shown right after registration (or
 * after an unverified password login redirect). Verification itself is
 * completed automatically by the action-code handler above when the user
 * opens the link in the email.
 */
function CheckEmailState({ initialSendFailed = false }: { initialSendFailed?: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  // The account was created, but the initial verification email genuinely
  // failed to send (the provider rejected it, or the send itself errored) —
  // never claim "we sent a link" in that case. Cleared the moment the user
  // successfully resends, so the honest state doesn't linger after recovery.
  const [sendFailed, setSendFailed] = useState(initialSendFailed);

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
      setSendFailed(false);
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
          <h1 className="text-headline-lg text-primary mb-2">
            {sendFailed ? "We couldn't send your verification email" : "Check your email"}
          </h1>
          {sendFailed ? (
            <p role="alert" aria-live="assertive" className="mb-8 text-label-md text-error bg-error-container text-on-error-container rounded-lg px-4 py-3">
              Your account was created, but we couldn&apos;t send the verification email to{" "}
              <span className="font-bold">{user?.email}</span>. Please try again below.
            </p>
          ) : (
            <p className="text-body-md text-secondary mb-8">
              We sent a verification link to <span className="font-bold">{user?.email}</span>. Click the
              link to activate your account — you&apos;ll be signed in automatically.
            </p>
          )}

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

        </div>
      </div>
    </main>
  );
}