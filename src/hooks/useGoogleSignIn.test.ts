import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockSignInWithPopup = vi.fn();

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
}));

vi.mock("@/firebase/config", () => ({
  auth: {},
}));

import { useGoogleSignIn } from "./useGoogleSignIn";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useGoogleSignIn", () => {
  it("calls onSuccess with a fresh ID token when signInWithPopup resolves", async () => {
    const fakeUser = { getIdToken: vi.fn().mockResolvedValue("google-id-token") };
    mockSignInWithPopup.mockResolvedValue({ user: fakeUser });
    const onSuccess = vi.fn();
    const clearError = vi.fn();
    const setError = vi.fn();

    const { result } = renderHook(() => useGoogleSignIn({ onSuccess, clearError, setError }));

    await act(async () => {
      await result.current.handleGoogleSignIn();
    });

    expect(clearError).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith("google-id-token");
    expect(setError).not.toHaveBeenCalled();
  });

  it("maps any Firebase error (including a would-be collision) to the caller's error slot, never throws", async () => {
    mockSignInWithPopup.mockRejectedValue({ code: "auth/popup-closed-by-user" });
    const onSuccess = vi.fn();
    const setError = vi.fn();

    const { result } = renderHook(() =>
      useGoogleSignIn({ onSuccess, clearError: vi.fn(), setError }),
    );

    await act(async () => {
      await result.current.handleGoogleSignIn();
    });

    expect(setError).toHaveBeenCalledWith("Google sign-in was cancelled.");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("tracks googleSubmitting across the async call", async () => {
    let resolveSignIn: (value: unknown) => void = () => {};
    mockSignInWithPopup.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }),
    );

    const { result } = renderHook(() =>
      useGoogleSignIn({ onSuccess: vi.fn(), clearError: vi.fn(), setError: vi.fn() }),
    );

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.handleGoogleSignIn();
    });
    expect(result.current.googleSubmitting).toBe(true);

    await act(async () => {
      resolveSignIn({ user: { getIdToken: vi.fn().mockResolvedValue("token") } });
      await pending;
    });
    expect(result.current.googleSubmitting).toBe(false);
  });
});
