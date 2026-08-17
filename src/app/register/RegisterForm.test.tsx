import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const mockFetchSignInMethodsForEmail = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockUpdateProfile = vi.fn();
const mockSignInWithPopup = vi.fn();
const mockSignOut = vi.fn();

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(),
  fetchSignInMethodsForEmail: (...args: unknown[]) => mockFetchSignInMethodsForEmail(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
}));

vi.mock("@/firebase/config", () => ({
  auth: { signOut: (...args: unknown[]) => mockSignOut(...args) },
}));

import { RegisterForm } from "./RegisterForm";

const VALID_PASSWORD = "Str0ng!Pass";

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("First Name"), "Ann");
  await user.type(screen.getByLabelText("Last Name"), "Lee");
  await user.type(screen.getByLabelText("Email Address"), "ann@example.com");
  await user.type(screen.getByLabelText("Password"), VALID_PASSWORD);
  await user.type(screen.getByLabelText("Confirm Password"), VALID_PASSWORD);
  await user.click(screen.getByRole("checkbox"));
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe("RegisterForm", () => {
  it("shows validation errors and does not call Firebase when required fields are empty", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("First name is required.")).toBeInTheDocument();
    expect(screen.getByText("Last name is required.")).toBeInTheDocument();
    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("You must accept the terms to continue.")).toBeInTheDocument();
    expect(mockCreateUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("shows a weak-password error and blocks submission for a password failing validatePassword rules", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("First Name"), "Ann");
    await user.type(screen.getByLabelText("Last Name"), "Lee");
    await user.type(screen.getByLabelText("Email Address"), "ann@example.com");
    await user.type(screen.getByLabelText("Password"), "weak");
    await user.type(screen.getByLabelText("Confirm Password"), "weak");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/password must/i)).toBeInTheDocument();
    expect(mockCreateUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("shows a mismatch error when password and confirmPassword differ", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("First Name"), "Ann");
    await user.type(screen.getByLabelText("Last Name"), "Lee");
    await user.type(screen.getByLabelText("Email Address"), "ann@example.com");
    await user.type(screen.getByLabelText("Password"), VALID_PASSWORD);
    await user.type(screen.getByLabelText("Confirm Password"), "SomethingElse1!");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(mockCreateUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("blocks submission with a duplicate-email error when the typed password doesn't match an existing password account (someone else's account, not a self-recovery)", async () => {
    mockCreateUserWithEmailAndPassword.mockRejectedValue({ code: "auth/email-already-in-use" });
    mockSignInWithEmailAndPassword.mockRejectedValue({ code: "auth/wrong-password" });
    mockFetchSignInMethodsForEmail.mockResolvedValue(["password"]);
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument();
  });

  it("blocks submission with a Google-specific message when the duplicate email turns out to be Google-only (checked only after sign-in fails, never as the primary gate — Email Enumeration Protection can make fetchSignInMethodsForEmail always return [])", async () => {
    mockCreateUserWithEmailAndPassword.mockRejectedValue({ code: "auth/email-already-in-use" });
    mockSignInWithEmailAndPassword.mockRejectedValue({ code: "auth/invalid-credential" });
    mockFetchSignInMethodsForEmail.mockResolvedValue(["google.com"]);
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/already registered with google.*continue with google instead/i),
    ).toBeInTheDocument();
  });

  it("self-heals a partial registration: when createUser rejects with email-already-in-use but the typed password matches an unverified account, it reconciles the DB row and resends verification instead of dead-ending", async () => {
    mockCreateUserWithEmailAndPassword.mockRejectedValue({ code: "auth/email-already-in-use" });
    const fakeUser = { emailVerified: false, getIdToken: vi.fn().mockResolvedValue("id-token-123") };
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: fakeUser });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: "1" } }),
    });

    const user = userEvent.setup();
    render(<RegisterForm />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/verify-email"));
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/users",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ idToken: "id-token-123", firstName: "Ann", lastName: "Lee" }) }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/send-verification-email",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ idToken: "id-token-123" }) }),
    );
  });

  it("does not sign a returning user in (signs back out) and shows the generic error when the matching password account is already fully verified", async () => {
    mockCreateUserWithEmailAndPassword.mockRejectedValue({ code: "auth/email-already-in-use" });
    const fakeUser = { emailVerified: true, getIdToken: vi.fn() };
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: fakeUser });

    const user = userEvent.setup();
    render(<RegisterForm />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument();
    expect(mockSignOut).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("happy path: creates Firebase user, calls POST /api/users, requests a verification email via the server, and redirects to /verify-email", async () => {
    mockFetchSignInMethodsForEmail.mockResolvedValue([]);
    const fakeUser = { getIdToken: vi.fn().mockResolvedValue("id-token-123") };
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: fakeUser });
    mockUpdateProfile.mockResolvedValue(undefined);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: "1" } }),
    });

    const user = userEvent.setup();
    render(<RegisterForm />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/verify-email"));

    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "ann@example.com",
      VALID_PASSWORD,
    );
    expect(mockUpdateProfile).toHaveBeenCalledWith(fakeUser, { displayName: "Ann Lee" });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/users",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ idToken: "id-token-123", firstName: "Ann", lastName: "Lee" }),
      }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/send-verification-email",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ idToken: "id-token-123" }),
      }),
    );
  });

  it("shows the server's error and does not redirect when POST /api/users fails (e.g. 409 duplicate)", async () => {
    mockFetchSignInMethodsForEmail.mockResolvedValue([]);
    const fakeUser = { getIdToken: vi.fn().mockResolvedValue("id-token-123") };
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: fakeUser });
    mockUpdateProfile.mockResolvedValue(undefined);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "An account with this email already exists." }),
    });

    const user = userEvent.setup();
    render(<RegisterForm />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalledWith("/api/auth/send-verification-email", expect.anything());
  });

  it("shows a mapped Firebase error message when createUserWithEmailAndPassword throws", async () => {
    mockFetchSignInMethodsForEmail.mockResolvedValue([]);
    mockCreateUserWithEmailAndPassword.mockRejectedValue({ code: "auth/email-already-in-use" });

    const user = userEvent.setup();
    render(<RegisterForm />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("Google sign-in posts to /api/auth/login with provider 'google' and redirects to / (Firebase/Identity Platform auto-links same-email accounts for this project, so there is no separate password-confirmation step to test here)", async () => {
    const fakeUser = { getIdToken: vi.fn().mockResolvedValue("google-id-token") };
    mockSignInWithPopup.mockResolvedValue({ user: fakeUser });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: "1" } }),
    });

    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
    expect(refreshMock).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ idToken: "google-id-token", provider: "google" }),
      }),
    );
  });

  it("shows a mapped error message when the Google popup sign-in fails", async () => {
    mockSignInWithPopup.mockRejectedValue({ code: "auth/popup-closed-by-user" });

    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(await screen.findByText("Google sign-in was cancelled.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
