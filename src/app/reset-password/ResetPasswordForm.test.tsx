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

const mockVerifyPasswordResetCode = vi.fn();
const mockConfirmPasswordReset = vi.fn();

vi.mock("firebase/auth", () => ({
  verifyPasswordResetCode: (...args: unknown[]) => mockVerifyPasswordResetCode(...args),
  confirmPasswordReset: (...args: unknown[]) => mockConfirmPasswordReset(...args),
}));

vi.mock("@/firebase/config", () => ({
  auth: {},
}));

import { ResetPasswordForm } from "./ResetPasswordForm";

const VALID_PASSWORD = "Str0ng!Pass";

beforeEach(() => {
  vi.clearAllMocks();
  searchParamsValue = new URLSearchParams({ oobCode: "abc123" });
});

describe("ResetPasswordForm", () => {
  it("shows the password form once verifyPasswordResetCode succeeds", async () => {
    mockVerifyPasswordResetCode.mockResolvedValue("ann@example.com");

    render(<ResetPasswordForm />);

    expect(await screen.findByLabelText("New Password")).toBeInTheDocument();
  });

  it("shows a mapped error and a link back to /forgot-password when the code is invalid/expired", async () => {
    mockVerifyPasswordResetCode.mockRejectedValue({ code: "auth/expired-action-code" });

    render(<ResetPasswordForm />);

    expect(await screen.findByText("This link has expired. Please request a new one.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /request a new password reset link/i })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  it("shows an error immediately (no verifyPasswordResetCode call) when the link is missing an oobCode", async () => {
    searchParamsValue = new URLSearchParams();

    render(<ResetPasswordForm />);

    expect(
      await screen.findByText(/missing required information/i),
    ).toBeInTheDocument();
    expect(mockVerifyPasswordResetCode).not.toHaveBeenCalled();
  });

  it("blocks submission client-side when the passwords don't match", async () => {
    mockVerifyPasswordResetCode.mockResolvedValue("ann@example.com");
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(await screen.findByLabelText("New Password"), VALID_PASSWORD);
    await user.type(screen.getByLabelText("Confirm New Password"), "SomethingElse1!");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(mockConfirmPasswordReset).not.toHaveBeenCalled();
  });

  it("submits via confirmPasswordReset and redirects to /login?passwordReset=true WITHOUT calling router.refresh (no session is minted here)", async () => {
    mockVerifyPasswordResetCode.mockResolvedValue("ann@example.com");
    mockConfirmPasswordReset.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(await screen.findByLabelText("New Password"), VALID_PASSWORD);
    await user.type(screen.getByLabelText("Confirm New Password"), VALID_PASSWORD);
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login?passwordReset=true"));
    expect(mockConfirmPasswordReset).toHaveBeenCalledWith(expect.anything(), "abc123", VALID_PASSWORD);
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("guards against duplicate submission while the reset request is in flight", async () => {
    mockVerifyPasswordResetCode.mockResolvedValue("ann@example.com");
    let resolveConfirm: () => void = () => {};
    mockConfirmPasswordReset.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveConfirm = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(await screen.findByLabelText("New Password"), VALID_PASSWORD);
    await user.type(screen.getByLabelText("Confirm New Password"), VALID_PASSWORD);
    const submitButton = screen.getByRole("button", { name: /reset password/i });
    await user.click(submitButton);

    expect(screen.getByRole("button", { name: /resetting password/i })).toBeDisabled();

    resolveConfirm();
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
    expect(mockConfirmPasswordReset).toHaveBeenCalledTimes(1);
  });
});
