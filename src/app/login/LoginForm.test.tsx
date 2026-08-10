import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const { mockSignInWithEmailAndPassword, mockSignInWithPopup, mockLinkWithCredential, mockCredentialFromError } =
  vi.hoisted(() => ({
    mockSignInWithEmailAndPassword: vi.fn(),
    mockSignInWithPopup: vi.fn(),
    mockLinkWithCredential: vi.fn(),
    mockCredentialFromError: vi.fn(),
  }));

vi.mock("firebase/auth", () => {
  const GoogleAuthProviderMock = vi.fn() as unknown as { new (): unknown } & {
    credentialFromError: typeof mockCredentialFromError;
  };
  (GoogleAuthProviderMock as unknown as { credentialFromError: unknown }).credentialFromError =
    mockCredentialFromError;
  return {
    GoogleAuthProvider: GoogleAuthProviderMock,
    linkWithCredential: (...args: unknown[]) => mockLinkWithCredential(...args),
    signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
    signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  };
});

vi.mock("@/firebase/config", () => ({
  auth: {},
}));

import { LoginForm } from "./LoginForm";

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe("LoginForm", () => {
  it("shows a required-fields error and does not call Firebase when email/password are empty", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Email and password are required.")).toBeInTheDocument();
    expect(mockSignInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("password flow happy path: signs in, POSTs /api/auth/login with provider 'password', redirects to /", async () => {
    const fakeUser = { getIdToken: vi.fn().mockResolvedValue("id-token-abc") };
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: fakeUser });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: "1" } }),
    });

    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email Address"), "ann@example.com");
    await user.type(screen.getByLabelText("Password"), "whatever-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
    expect(refreshMock).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ idToken: "id-token-abc", provider: "password" }),
      }),
    );
  });

  it("shows a generic invalid-credentials message and does not redirect on failed password sign-in", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({ code: "auth/invalid-credential" });

    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email Address"), "ann@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows the server error and does not redirect when POST /api/auth/login returns a non-ok response (e.g. 404 no account)", async () => {
    const fakeUser = { getIdToken: vi.fn().mockResolvedValue("id-token-abc") };
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: fakeUser });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "No account found for this email. Please create an account first." }),
    });

    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email Address"), "ann@example.com");
    await user.type(screen.getByLabelText("Password"), "whatever-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText("No account found for this email. Please create an account first."),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("Google flow happy path: signs in via popup, POSTs /api/auth/login with provider 'google', redirects to /", async () => {
    const fakeUser = { getIdToken: vi.fn().mockResolvedValue("google-id-token") };
    mockSignInWithPopup.mockResolvedValue({ user: fakeUser });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: "1" } }),
    });

    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ idToken: "google-id-token", provider: "google" }),
      }),
    );
  });

  it("shows a mapped error message when the Google popup sign-in is cancelled", async () => {
    mockSignInWithPopup.mockRejectedValue({ code: "auth/popup-closed-by-user" });

    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(await screen.findByText("Google sign-in was cancelled.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("renders a Forgot Password link pointing at /forgot-password", () => {
    render(<LoginForm />);
    expect(screen.getByRole("link", { name: /forgot password/i })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  describe("account linking (Google sign-in colliding with an existing password account)", () => {
    const fakeGoogleCredential = { providerId: "google.com" };

    it("shows a link-accounts prompt when Google sign-in fails with account-exists-with-different-credential", async () => {
      mockSignInWithPopup.mockRejectedValue({
        code: "auth/account-exists-with-different-credential",
        customData: { email: "ann@example.com" },
      });
      mockCredentialFromError.mockReturnValue(fakeGoogleCredential);

      const user = userEvent.setup();
      render(<LoginForm />);
      await user.click(screen.getByRole("button", { name: /continue with google/i }));

      expect(
        await screen.findByText(/an account already exists for/i),
      ).toBeInTheDocument();
      expect(screen.getByText("ann@example.com")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /link google account/i })).toBeInTheDocument();
    });

    it("falls back to the generic mapped error if the pending credential/email can't be recovered", async () => {
      mockSignInWithPopup.mockRejectedValue({
        code: "auth/account-exists-with-different-credential",
        customData: {},
      });
      mockCredentialFromError.mockReturnValue(null);

      const user = userEvent.setup();
      render(<LoginForm />);
      await user.click(screen.getByRole("button", { name: /continue with google/i }));

      expect(
        await screen.findByText("An account with this email already exists using a different sign-in method."),
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /link google account/i })).not.toBeInTheDocument();
    });

    it("links the pending Google credential to the existing password account and redirects to / on success", async () => {
      mockSignInWithPopup.mockRejectedValue({
        code: "auth/account-exists-with-different-credential",
        customData: { email: "ann@example.com" },
      });
      mockCredentialFromError.mockReturnValue(fakeGoogleCredential);
      const fakeUser = { getIdToken: vi.fn().mockResolvedValue("linked-id-token") };
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: fakeUser });
      mockLinkWithCredential.mockResolvedValue(undefined);
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: "1" } }),
      });

      const user = userEvent.setup();
      render(<LoginForm />);
      await user.click(screen.getByRole("button", { name: /continue with google/i }));
      await screen.findByRole("button", { name: /link google account/i });

      await user.type(screen.getByLabelText("Password for account linking"), "existing-password");
      await user.click(screen.getByRole("button", { name: /link google account/i }));

      await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        "ann@example.com",
        "existing-password",
      );
      expect(mockLinkWithCredential).toHaveBeenCalledWith(fakeUser, fakeGoogleCredential);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ idToken: "linked-id-token", provider: "password" }),
        }),
      );
    });

    it("shows an error and keeps the prompt open when the password entered for linking is wrong", async () => {
      mockSignInWithPopup.mockRejectedValue({
        code: "auth/account-exists-with-different-credential",
        customData: { email: "ann@example.com" },
      });
      mockCredentialFromError.mockReturnValue(fakeGoogleCredential);
      mockSignInWithEmailAndPassword.mockRejectedValue({ code: "auth/invalid-credential" });

      const user = userEvent.setup();
      render(<LoginForm />);
      await user.click(screen.getByRole("button", { name: /continue with google/i }));
      await screen.findByRole("button", { name: /link google account/i });

      await user.type(screen.getByLabelText("Password for account linking"), "wrong-password");
      await user.click(screen.getByRole("button", { name: /link google account/i }));

      expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
      expect(mockLinkWithCredential).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /link google account/i })).toBeInTheDocument();
    });

    it("shows a distinct linking-failure message (not the wrong-password message) when the password is correct but linkWithCredential itself fails", async () => {
      mockSignInWithPopup.mockRejectedValue({
        code: "auth/account-exists-with-different-credential",
        customData: { email: "ann@example.com" },
      });
      mockCredentialFromError.mockReturnValue(fakeGoogleCredential);
      const fakeUser = { getIdToken: vi.fn().mockResolvedValue("linked-id-token") };
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: fakeUser });
      mockLinkWithCredential.mockRejectedValue({ code: "auth/invalid-credential" });

      const user = userEvent.setup();
      render(<LoginForm />);
      await user.click(screen.getByRole("button", { name: /continue with google/i }));
      await screen.findByRole("button", { name: /link google account/i });

      await user.type(screen.getByLabelText("Password for account linking"), "correct-password");
      await user.click(screen.getByRole("button", { name: /link google account/i }));

      expect(
        await screen.findByText(/your password was correct, but we couldn't link your google account/i),
      ).toBeInTheDocument();
      expect(screen.queryByText("Invalid email or password.")).not.toBeInTheDocument();
      expect(pushMock).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /link google account/i })).toBeInTheDocument();
    });

    it("dismisses the prompt without calling Firebase when Cancel is clicked", async () => {
      mockSignInWithPopup.mockRejectedValue({
        code: "auth/account-exists-with-different-credential",
        customData: { email: "ann@example.com" },
      });
      mockCredentialFromError.mockReturnValue(fakeGoogleCredential);

      const user = userEvent.setup();
      render(<LoginForm />);
      await user.click(screen.getByRole("button", { name: /continue with google/i }));
      await screen.findByRole("button", { name: /link google account/i });

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(screen.queryByRole("button", { name: /link google account/i })).not.toBeInTheDocument();
      expect(mockSignInWithEmailAndPassword).not.toHaveBeenCalled();
    });
  });
});
