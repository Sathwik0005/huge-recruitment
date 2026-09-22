"use client";

import { useConsent } from "@/components/ConsentProvider";

export default function CookieSettingsLink() {
  const { openSettings } = useConsent();

  return (
    <button
      type="button"
      onClick={openSettings}
      className="text-white/70 underline-offset-4 transition-colors duration-200 hover:text-secondary-container hover:underline"
    >
      Cookie Settings
    </button>
  );
}
