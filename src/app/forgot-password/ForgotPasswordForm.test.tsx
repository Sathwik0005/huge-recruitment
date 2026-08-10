import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSendPasswordResetEmail = vi.fn();

vi.mock("firebase/auth", () => ({
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
}));

vi.mock("@/firebase/config", () => ({
  auth: {},
}));

import { ForgotPasswordForm } from "./ForgotPasswordForm";

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for that email, we've sent a password reset link. Check your inbox.";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ForgotPasswordForm", () => {
  it("shows a required-email error and does not call Firebase when the email field is empty", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText("Email is required.")).toBeInTheDocument();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("shows the generic success message for a genuinely existing account", async () => {
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email Address"), "real@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(GENERIC_SUCCESS_MESSAGE)).toBeInTheDocument();
  });

  it("anti-enumeration: shows the SAME generic success message for auth/user-not-found as for a true success", async () => {
    mockSendPasswordResetEmail.mockRejectedValue({ code: "auth/user-not-found" });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email Address"), "unknown@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(GENERIC_SUCCESS_MESSAGE)).toBeInTheDocument();
  });

  it("anti-enumeration: shows the SAME generic success message for auth/invalid-credential", async () => {
    mockSendPasswordResetEmail.mockRejectedValue({ code: "auth/invalid-credential" });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email Address"), "unknown@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(GENERIC_SUCCESS_MESSAGE)).toBeInTheDocument();
  });

  it("shows a distinct invalid-email message for a malformed email, not the generic success message", async () => {
    mockSendPasswordResetEmail.mockRejectedValue({ code: "auth/invalid-email" });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email Address"), "not-an-email");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText("Please enter a valid email address.")).toBeInTheDocument();
    expect(screen.queryByText(GENERIC_SUCCESS_MESSAGE)).not.toBeInTheDocument();
  });

  it("shows a generic error (not success) for an unrelated Firebase failure such as network-request-failed", async () => {
    mockSendPasswordResetEmail.mockRejectedValue({ code: "auth/network-request-failed" });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email Address"), "real@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(
      await screen.findByText("Network error. Please check your connection and try again."),
    ).toBeInTheDocument();
    expect(screen.queryByText(GENERIC_SUCCESS_MESSAGE)).not.toBeInTheDocument();
  });
});
