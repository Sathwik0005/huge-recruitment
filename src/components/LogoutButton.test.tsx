import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const mockSignOut = vi.fn();
vi.mock("firebase/auth", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

vi.mock("@/firebase/config", () => ({
  auth: {},
}));

import { LogoutButton } from "./LogoutButton";

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  mockSignOut.mockResolvedValue(undefined);
});

describe("LogoutButton", () => {
  it("signs out of Firebase, POSTs /api/auth/logout, and redirects to /login", async () => {
    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
    expect(mockSignOut).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("disables the button while the logout request is in flight", async () => {
    let resolveSignOut: () => void = () => {};
    mockSignOut.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSignOut = resolve;
      }),
    );

    const user = userEvent.setup();
    render(<LogoutButton />);
    const button = screen.getByRole("button", { name: /sign out/i });

    await user.click(button);
    expect(screen.getByRole("button", { name: /signing out/i })).toBeDisabled();

    resolveSignOut();
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
  });
});
