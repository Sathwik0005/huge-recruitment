import { describe, it, expect, beforeEach, vi } from "vitest";
import { toAppActionLink } from "./firebase-action-link";

const AUTH_DOMAIN = "huge-recruitment.firebaseapp.com";
const APP_URL = "https://example.test";

function firebaseLink(params: Record<string, string | undefined>) {
  const url = new URL(`https://${AUTH_DOMAIN}/__/auth/action`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return url.toString();
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", AUTH_DOMAIN);
  vi.stubEnv("NEXT_PUBLIC_APP_URL", APP_URL);
});

describe("toAppActionLink", () => {
  it("transforms a verifyEmail Firebase link to {APP_URL}/auth/action, preserving mode", () => {
    const link = firebaseLink({ mode: "verifyEmail", oobCode: "abc123", apiKey: "AIzaFakeKey" });
    const result = toAppActionLink(link, "verifyEmail");

    expect(result).toBe(`${APP_URL}/auth/action?mode=verifyEmail&oobCode=abc123&apiKey=AIzaFakeKey`);
  });

  it("transforms a resetPassword Firebase link to {APP_URL}/auth/action, preserving mode", () => {
    const link = firebaseLink({ mode: "resetPassword", oobCode: "xyz789", apiKey: "AIzaFakeKey" });
    const result = toAppActionLink(link, "resetPassword");

    expect(result).toBe(`${APP_URL}/auth/action?mode=resetPassword&oobCode=xyz789&apiKey=AIzaFakeKey`);
  });

  it("preserves all allowlisted parameters (oobCode, apiKey, continueUrl, lang, tenantId) exactly", () => {
    const link = firebaseLink({
      mode: "verifyEmail",
      oobCode: "abc123",
      apiKey: "AIzaFakeKey",
      continueUrl: "https://example.test/verify-email",
      lang: "en",
      tenantId: "tenant-1",
    });

    const result = toAppActionLink(link, "verifyEmail");
    const resultParams = new URL(result).searchParams;

    expect(resultParams.get("mode")).toBe("verifyEmail");
    expect(resultParams.get("oobCode")).toBe("abc123");
    expect(resultParams.get("apiKey")).toBe("AIzaFakeKey");
    expect(resultParams.get("continueUrl")).toBe("https://example.test/verify-email");
    expect(resultParams.get("lang")).toBe("en");
    expect(resultParams.get("tenantId")).toBe("tenant-1");
  });

  it("drops unknown query parameters instead of forwarding them", () => {
    const link = firebaseLink({ mode: "verifyEmail", oobCode: "abc123", apiKey: "AIzaFakeKey", trackingId: "evil" });

    const result = toAppActionLink(link, "verifyEmail");

    expect(result).not.toContain("trackingId");
  });

  it("URL-encodes special characters in forwarded parameter values safely", () => {
    const link = firebaseLink({
      mode: "verifyEmail",
      oobCode: "abc123",
      apiKey: "AIzaFakeKey",
      continueUrl: "https://example.test/?next=a&b=c",
    });

    const result = toAppActionLink(link, "verifyEmail");

    expect(result).toBe(
      `${APP_URL}/auth/action?mode=verifyEmail&oobCode=abc123&apiKey=AIzaFakeKey&continueUrl=` +
        encodeURIComponent("https://example.test/?next=a&b=c"),
    );
  });

  it("rejects a missing oobCode", () => {
    const link = firebaseLink({ mode: "verifyEmail", apiKey: "AIzaFakeKey" });
    expect(() => toAppActionLink(link, "verifyEmail")).toThrow(/oobCode/);
  });

  it("rejects a missing apiKey", () => {
    const link = firebaseLink({ mode: "verifyEmail", oobCode: "abc123" });
    expect(() => toAppActionLink(link, "verifyEmail")).toThrow(/apiKey/);
  });

  it("rejects an unrecognised mode", () => {
    const link = firebaseLink({ mode: "recoverEmail", oobCode: "abc123", apiKey: "AIzaFakeKey" });
    expect(() => toAppActionLink(link, "verifyEmail")).toThrow(/mode/i);
  });

  it("rejects a mismatch between the generated link's mode and the caller's expected mode", () => {
    const link = firebaseLink({ mode: "resetPassword", oobCode: "abc123", apiKey: "AIzaFakeKey" });
    expect(() => toAppActionLink(link, "verifyEmail")).toThrow(/does not match expected mode/);
  });

  it("rejects a non-HTTPS Firebase link", () => {
    const link = firebaseLink({ mode: "verifyEmail", oobCode: "abc123", apiKey: "AIzaFakeKey" }).replace(
      "https://",
      "http://",
    );
    expect(() => toAppActionLink(link, "verifyEmail")).toThrow(/HTTPS/);
  });

  it("rejects an unexpected origin (not the configured Firebase auth domain)", () => {
    const link = "https://evil.example.com/__/auth/action?mode=verifyEmail&oobCode=abc123&apiKey=AIzaFakeKey";
    expect(() => toAppActionLink(link, "verifyEmail")).toThrow(/origin/);
  });

  it("rejects an unexpected path on the correct origin", () => {
    const link = `https://${AUTH_DOMAIN}/some/other/path?mode=verifyEmail&oobCode=abc123&apiKey=AIzaFakeKey`;
    expect(() => toAppActionLink(link, "verifyEmail")).toThrow(/path/);
  });

  it("rejects a malformed URL", () => {
    expect(() => toAppActionLink("not-a-url", "verifyEmail")).toThrow(/Malformed/);
  });

  it("never lets continueUrl influence the returned destination — only /auth/action is ever produced", () => {
    const link = firebaseLink({
      mode: "verifyEmail",
      oobCode: "abc123",
      apiKey: "AIzaFakeKey",
      continueUrl: "https://evil.example.com/steal",
    });

    const result = toAppActionLink(link, "verifyEmail");

    expect(result.startsWith(`${APP_URL}/auth/action?`)).toBe(true);
  });
});
