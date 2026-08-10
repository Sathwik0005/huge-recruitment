import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/require-verified-session", () => ({
  requireVerifiedSession: vi.fn(),
}));

vi.mock("@/components/LogoutButton", () => ({
  LogoutButton: () => <button type="button">Sign Out</button>,
}));

import { requireVerifiedSession } from "@/lib/require-verified-session";
import Home from "./page";

const mockRequireVerifiedSession = vi.mocked(requireVerifiedSession);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/ (protected home page)", () => {
  it("redirects to /login when unauthenticated", async () => {
    mockRequireVerifiedSession.mockResolvedValue({ status: "unauthenticated" });

    await expect(Home()).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to /login when there is a verified session but no matching DB user", async () => {
    mockRequireVerifiedSession.mockResolvedValue({ status: "no-db-user" });

    await expect(Home()).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to /verify-email when the session is unverified (server-side enforcement, decision #2)", async () => {
    mockRequireVerifiedSession.mockResolvedValue({ status: "unverified" });

    await expect(Home()).rejects.toThrow("REDIRECT:/verify-email");
  });

  it("renders the authenticated landing page with the user's name, email, role, and status when verified", async () => {
    mockRequireVerifiedSession.mockResolvedValue({
      status: "ok",
      user: {
        id: "1",
        firebaseUid: "uid-1",
        firstName: "Ann",
        lastName: "Lee",
        email: "ann@example.com",
        role: "USER",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never,
    });

    const jsx = await Home();
    render(jsx);

    expect(screen.getByText(/welcome, ann/i)).toBeInTheDocument();
    expect(screen.getByText("ann@example.com")).toBeInTheDocument();
    expect(screen.getByText("USER")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
});
