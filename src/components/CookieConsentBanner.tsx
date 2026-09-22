"use client";

import { useConsent } from "@/components/ConsentProvider";

export default function CookieConsentBanner() {
  const { bannerOpen, accept, reject, closeSettings } = useConsent();

  if (!bannerOpen) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-outline-variant bg-white px-margin-mobile py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.1)] md:px-margin-desktop"
    >
      <div className="mx-auto flex max-w-container-max flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-on-surface-variant">
          We use analytics cookies to understand how visitors use this site and improve it. We
          only set them if you accept — see our{" "}
          <a href="/privacy-policy" className="text-primary underline underline-offset-4">
            Privacy Policy
          </a>{" "}
          for details. You can change your choice at any time.
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={reject}
            className="rounded-lg border border-primary px-5 py-2 text-sm font-bold text-primary transition-opacity hover:opacity-80"
          >
            Reject analytics
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Accept analytics
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={closeSettings}
        aria-label="Close"
        className="absolute right-2 top-2 rounded-lg p-1 text-on-surface-variant hover:text-primary md:hidden"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );
}
