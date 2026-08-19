import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
const refreshMock = vi.fn();
let searchParamsValue = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  useSearchParams: () => searchParamsValue,
}));

const mockSignInWithEmailAndPassword = vi.fn();
const mockSignInWithPopup = vi.fn();

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
}));

vi.mock("@/firebase/config", () => ({
  auth: {},
}));

import { LoginForm } from "./LoginForm";

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
  searchParamsValue = new URLSearchParams();
});

describe("LoginForm", () => {
  it("shows confirmation after a successful password reset", () => {
    searchParamsValue = new URLSearchParams({ passwordReset: "true" });

    render(<LoginForm />);

    expect(screen.getByText(/password has been reset successfully/i)).toBeInTheDocument();
  });

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

  it("routes to /verify-email (not an inline error) when the server refuses a session for an unverified account", async () => {
    const fakeUser = { getIdToken: vi.fn().mockResolvedValue("id-token-abc") };
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: fakeUser });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Please verify your email before signing in.", code: "email-not-verified" }),
    });

    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email Address"), "ann@example.com");
    await user.type(screen.getByLabelText("Password"), "whatever-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/verify-email"));
    expect(screen.queryByText("Please verify your email before signing in.")).not.toBeInTheDocument();
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

  it("Google flow happy path: signs in via popup, POSTs /api/auth/login with provider 'google', redirects to / (Firebase/Identity Platform auto-links same-email accounts for this project, so there is no separate password-confirmation step to test here)", async () => {
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
});