import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import AuthActionPage from "./page";

function searchParams(params: Record<string, string | undefined>) {
  return Promise.resolve(params);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/auth/action — shared Firebase email-action router", () => {
  it("forwards mode=verifyEmail to /verify-email, preserving mode and oobCode", async () => {
    await expect(
      AuthActionPage({ searchParams: searchParams({ mode: "verifyEmail", oobCode: "abc123", apiKey: "key" }) }),
    ).rejects.toThrow("REDIRECT:/verify-email?mode=verifyEmail&oobCode=abc123&apiKey=key");
  });

  it("forwards mode=resetPassword to /reset-password, preserving mode and oobCode", async () => {
    await expect(
      AuthActionPage({ searchParams: searchParams({ mode: "resetPassword", oobCode: "xyz789", apiKey: "key" }) }),
    ).rejects.toThrow("REDIRECT:/reset-password?mode=resetPassword&oobCode=xyz789&apiKey=key");
  });

  it("preserves all Firebase-supplied parameters (apiKey, continueUrl, lang, tenantId) when present", async () => {
    await expect(
      AuthActionPage({
        searchParams: searchParams({
          mode: "verifyEmail",
          oobCode: "abc123",
          apiKey: "AIzaFakeKey",
          continueUrl: "https://huge-recruitment.vercel.app/",
          lang: "en",
          tenantId: "tenant-1",
        }),
      }),
    ).rejects.toThrow(
      "REDIRECT:/verify-email?mode=verifyEmail&oobCode=abc123&apiKey=AIzaFakeKey&continueUrl=" +
        encodeURIComponent("https://huge-recruitment.vercel.app/") +
        "&lang=en&tenantId=tenant-1",
    );
  });

  it("URL-encodes forwarded parameter values safely (a continueUrl with special characters can't break the query string)", async () => {
    await expect(
      AuthActionPage({
        searchParams: searchParams({
          mode: "verifyEmail",
          oobCode: "abc123",
          apiKey: "key",
          continueUrl: "https://huge-recruitment.vercel.app/?next=a&b=c",
        }),
      }),
    ).rejects.toThrow(
      "REDIRECT:/verify-email?mode=verifyEmail&oobCode=abc123&apiKey=key&continueUrl=" +
        encodeURIComponent("https://huge-recruitment.vercel.app/?next=a&b=c"),
    );
  });

  it("never redirects to an attacker-supplied continueUrl — the destination is chosen from mode alone", async () => {
    const { redirect } = await import("next/navigation");

    await expect(
      AuthActionPage({
        searchParams: searchParams({
          mode: "verifyEmail",
          oobCode: "abc123",
          apiKey: "key",
          continueUrl: "https://evil.example.com/steal",
        }),
      }),
    ).rejects.toThrow(/^REDIRECT:\/verify-email\?/);

    const [calledUrl] = vi.mocked(redirect).mock.calls[0];
    // The evil URL is only ever forwarded as an inert query-string value on our
    // own allowlisted path — it must never become (or influence) the redirect
    // destination itself.
    expect(calledUrl.startsWith("/verify-email?")).toBe(true);
    expect(calledUrl.startsWith("https://evil.example.com")).toBe(false);
  });

  it("shows the auth-themed error state, with no redirect, when mode is missing", async () => {
    const { redirect } = await import("next/navigation");

    const jsx = await AuthActionPage({ searchParams: searchParams({ oobCode: "abc123" }) });
    render(jsx);

    expect(screen.getByRole("heading", { name: /this link isn.t valid/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to login/i })).toHaveAttribute("href", "/login");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("shows the auth-themed error state, with no redirect, for an unsupported mode (e.g. recoverEmail, which has no existing handler)", async () => {
    const { redirect } = await import("next/navigation");

    const jsx = await AuthActionPage({
      searchParams: searchParams({ mode: "recoverEmail", oobCode: "abc123" }),
    });
    render(jsx);

    expect(screen.getByRole("heading", { name: /this link isn.t valid/i })).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([
    { mode: "verifyEmail", apiKey: "key" },
    { mode: "verifyEmail", oobCode: "abc123" },
    { mode: "resetPassword", apiKey: "key" },
    { mode: "resetPassword", oobCode: "abc123" },
  ])("shows the error state instead of redirecting when a required Firebase parameter is missing: %o", async (params) => {
    const { redirect } = await import("next/navigation");

    const jsx = await AuthActionPage({ searchParams: searchParams(params) });
    render(jsx);

    expect(screen.getByRole("heading", { name: /this link isn.t valid/i })).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("does not render a button on the unsupported-mode error state (link-only navigation, matching the existing auth theme)", async () => {
    const jsx = await AuthActionPage({ searchParams: searchParams({ mode: "bogus" }) });
    render(jsx);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});