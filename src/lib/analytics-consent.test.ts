import { describe, it, expect, beforeEach } from "vitest";
import { getStoredConsent, setStoredConsent, CONSENT_COOKIE_NAME } from "./analytics-consent";

beforeEach(() => {
  document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0`;
});

describe("analytics-consent", () => {
  it("returns null when no consent cookie is set", () => {
    expect(getStoredConsent()).toBeNull();
  });

  it("persists an accepted choice and reads it back", () => {
    setStoredConsent("granted");
    expect(getStoredConsent()).toBe("granted");
  });

  it("persists a rejected choice and reads it back", () => {
    setStoredConsent("denied");
    expect(getStoredConsent()).toBe("denied");
  });

  it("ignores a garbage cookie value", () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=nonsense; path=/`;
    expect(getStoredConsent()).toBeNull();
  });
});
