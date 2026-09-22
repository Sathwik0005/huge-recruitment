"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  getStoredConsent,
  setStoredConsent,
  type ConsentChoice,
} from "@/lib/analytics-consent";

interface ConsentContextValue {
  /** `null` = not yet decided (banner should show). */
  consent: ConsentChoice | null;
  bannerOpen: boolean;
  accept: () => void;
  reject: () => void;
  openSettings: () => void;
  closeSettings: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentChoice | null>(null);
  const [bannerOpen, setBannerOpen] = useState(false);

  useEffect(() => {
    // One-time hydration read of the consent cookie (an external system) —
    // server and first client render both start from `null`/closed to avoid
    // a hydration mismatch, then this syncs in the real stored choice.
    const stored = getStoredConsent();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(stored);
    setBannerOpen(stored === null);
  }, []);

  const choose = (choice: ConsentChoice) => {
    setStoredConsent(choice);
    setConsent(choice);
    setBannerOpen(false);
  };

  const value: ConsentContextValue = {
    consent,
    bannerOpen,
    accept: () => choose("granted"),
    reject: () => choose("denied"),
    openSettings: () => setBannerOpen(true),
    closeSettings: () => setBannerOpen(false),
  };

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent must be used within a ConsentProvider");
  return ctx;
}
