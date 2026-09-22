import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConsentProvider } from "./ConsentProvider";
import CookieConsentBanner from "./CookieConsentBanner";
import { CONSENT_COOKIE_NAME, getStoredConsent } from "@/lib/analytics-consent";

function renderBanner() {
  return render(
    <ConsentProvider>
      <CookieConsentBanner />
    </ConsentProvider>,
  );
}

beforeEach(() => {
  document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0`;
});

describe("CookieConsentBanner", () => {
  it("shows the banner with no pre-ticked choice when consent hasn't been decided", async () => {
    renderBanner();
    await waitFor(() => expect(screen.getByRole("region", { name: /cookie consent/i })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /accept analytics/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject analytics/i })).toBeInTheDocument();
  });

  it("does not render once a choice was already stored", () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=granted; path=/`;
    renderBanner();
    expect(screen.queryByRole("region", { name: /cookie consent/i })).not.toBeInTheDocument();
  });

  it("persists rejection and hides the banner", async () => {
    const user = userEvent.setup();
    renderBanner();
    await waitFor(() => screen.getByRole("button", { name: /reject analytics/i }));

    await user.click(screen.getByRole("button", { name: /reject analytics/i }));

    expect(getStoredConsent()).toBe("denied");
    expect(screen.queryByRole("region", { name: /cookie consent/i })).not.toBeInTheDocument();
  });

  it("persists acceptance and hides the banner", async () => {
    const user = userEvent.setup();
    renderBanner();
    await waitFor(() => screen.getByRole("button", { name: /accept analytics/i }));

    await user.click(screen.getByRole("button", { name: /accept analytics/i }));

    expect(getStoredConsent()).toBe("granted");
    expect(screen.queryByRole("region", { name: /cookie consent/i })).not.toBeInTheDocument();
  });
});
