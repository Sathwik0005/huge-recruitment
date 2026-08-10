"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, reload, sendEmailVerification, type User } from "firebase/auth";
import { auth } from "@/firebase/config";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
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
      await sendEmailVerification(auth.currentUser);
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
    <main className="flex-grow flex items-center justify-center py-20 px-gutter">
      <div className="w-full max-w-[440px]">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-[0_4px_20px_-2px_rgba(2,36,72,0.08)] text-center">
          <h1 className="text-headline-lg text-primary mb-2">Verify your email</h1>
          <p className="text-body-md text-secondary mb-8">
            We sent a verification link to <span className="font-bold">{user?.email}</span>. Check your
            inbox to activate your account.
          </p>

          {message && <p className="text-label-md text-on-surface-variant mb-4">{message}</p>}

          <button
            type="button"
            onClick={handleCheckVerified}
            disabled={checking}
            className="w-full h-12 bg-primary text-on-primary text-body-md font-bold rounded-lg hover:bg-secondary hover:text-on-secondary transition-all disabled:opacity-60"
          >
            {checking ? "Checking..." : "I've Verified My Email"}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="w-full h-12 mt-4 border border-outline-variant text-primary text-body-md font-bold rounded-lg hover:bg-surface-container-low transition-all disabled:opacity-60"
          >
            {cooldown > 0 ? `Resend available in ${cooldown}s` : resending ? "Sending..." : "Resend Email"}
          </button>
        </div>
      </div>
    </main>
  );
}
