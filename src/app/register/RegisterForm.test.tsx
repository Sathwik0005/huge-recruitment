import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const mockFetchSignInMethodsForEmail = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockUpdateProfile = vi.fn();
const mockSendEmailVerification = vi.fn();

vi.mock("firebase/auth", () => ({
  fetchSignInMethodsForEmail: (...args: unknown[]) => mockFetchSignInMethodsForEmail(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUserWithEmailAndPassword(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  sendEmailVerification: (...args: unknown[]) => mockSendEmailVerification(...args),
}));

vi.mock("@/firebase/config", () => ({
  auth: {},
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

  it("blocks submission with a duplicate-email error when fetchSignInMethodsForEmail finds an existing account, without calling createUser", async () => {
    mockFetchSignInMethodsForEmail.mockResolvedValue(["password"]);
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument();
    expect(mockCreateUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("happy path: creates Firebase user, calls POST /api/users, sends verification email, and redirects to /verify-email", async () => {
    mockFetchSignInMethodsForEmail.mockResolvedValue([]);
    const fakeUser = { getIdToken: vi.fn().mockResolvedValue("id-token-123") };
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: fakeUser });
    mockUpdateProfile.mockResolvedValue(undefined);
    mockSendEmailVerification.mockResolvedValue(undefined);
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
    expect(mockSendEmailVerification).toHaveBeenCalledWith(fakeUser);
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
    expect(mockSendEmailVerification).not.toHaveBeenCalled();
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
});
