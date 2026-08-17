import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ForgotPasswordForm } from "./ForgotPasswordForm";

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for that email address, we've sent a password reset link. Please check your inbox and spam folder.";

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe("ForgotPasswordForm", () => {
  it("shows a required-email error and does not call fetch when the email field is empty", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText("Email is required.")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("posts the email to /api/auth/forgot-password and shows the generic success message on a 200", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email Address"), "real@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(GENERIC_SUCCESS_MESSAGE)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/forgot-password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "real@example.com" }),
      }),
    );
  });

  it("still shows the generic success message even for a simulated non-200 response (server always responds generically, but the client itself doesn't distinguish either)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "unexpected" }),
    });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email Address"), "unknown@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(GENERIC_SUCCESS_MESSAGE)).toBeInTheDocument();
  });

  it("shows the generic success message even on a genuine network failure (documented tradeoff: an outage looks identical to a nonexistent account)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email Address"), "real@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(GENERIC_SUCCESS_MESSAGE)).toBeInTheDocument();
  });
});
