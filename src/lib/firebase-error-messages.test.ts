import { describe, it, expect } from "vitest";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-messages";

describe("getFirebaseErrorMessage", () => {
  it.each([
    ["auth/email-already-in-use", "An account with this email already exists."],
    ["auth/weak-password", "Password is too weak. Please choose a stronger password."],
    ["auth/network-request-failed", "Network error. Please check your connection and try again."],
    ["auth/invalid-email", "Please enter a valid email address."],
    ["auth/invalid-credential", "Invalid email or password."],
    ["auth/wrong-password", "Invalid email or password."],
    ["auth/user-not-found", "Invalid email or password."],
    ["auth/too-many-requests", "Too many attempts. Please wait a moment and try again."],
    ["auth/popup-closed-by-user", "Google sign-in was cancelled."],
    ["auth/cancelled-popup-request", "Google sign-in was cancelled."],
    [
      "auth/account-exists-with-different-credential",
      "An account with this email already exists using a different sign-in method.",
    ],
    ["auth/expired-action-code", "This link has expired. Please request a new one."],
    ["auth/invalid-action-code", "This link is invalid or has already been used. Please request a new one."],
    ["auth/user-disabled", "This account has been disabled. Please contact support."],
    ["auth/requires-recent-login", "For your security, please sign in again before continuing."],
  ])("maps %s to a user-facing message", (code, expected) => {
    expect(getFirebaseErrorMessage({ code })).toBe(expected);
  });

  it("maps invalid-credential and user-not-found to the SAME generic message (anti-enumeration)", () => {
    expect(getFirebaseErrorMessage({ code: "auth/invalid-credential" })).toBe(
      getFirebaseErrorMessage({ code: "auth/user-not-found" }),
    );
  });

  it("falls back to a generic message for an unknown error code", () => {
    expect(getFirebaseErrorMessage({ code: "auth/some-unmapped-code" })).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("falls back to a generic message when the error has no code", () => {
    expect(getFirebaseErrorMessage(new Error("boom"))).toBe("Something went wrong. Please try again.");
  });

  it("falls back to a generic message for null/undefined input", () => {
    expect(getFirebaseErrorMessage(null)).toBe("Something went wrong. Please try again.");
    expect(getFirebaseErrorMessage(undefined)).toBe("Something went wrong. Please try again.");
  });

  it("never throws regardless of input shape", () => {
    expect(() => getFirebaseErrorMessage("a plain string")).not.toThrow();
    expect(() => getFirebaseErrorMessage(42)).not.toThrow();
  });
});
