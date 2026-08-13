import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  usePathname: vi.fn(() => "/admin"),
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
}));

vi.mock("firebase/auth", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/firebase/config", () => ({
  auth: {},
}));

vi.mock("@/lib/require-admin-session", () => ({
  requireAdminSession: vi.fn(),
}));

import { requireAdminSession } from "@/lib/require-admin-session";
import AdminLayout from "./layout";

const mockRequireAdminSession = vi.mocked(requireAdminSession);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/admin layout auth gate", () => {
  it("redirects to /login when unauthenticated", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "unauthenticated" });

    await expect(AdminLayout({ children: <div /> })).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to /login when unverified", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "unverified" });

    await expect(AdminLayout({ children: <div /> })).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to /login when there is no matching DB user", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "no-db-user" });

    await expect(AdminLayout({ children: <div /> })).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to / (not a 403) when the user is authenticated but not an admin", async () => {
    mockRequireAdminSession.mockResolvedValue({ status: "forbidden" });

    await expect(AdminLayout({ children: <div /> })).rejects.toThrow("REDIRECT:/");
  });

  it("renders the admin shell and children when the session is an active admin", async () => {
    mockRequireAdminSession.mockResolvedValue({
      status: "ok",
      user: {
        id: "1",
        firebaseUid: "uid-1",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        role: "ADMIN",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never,
    });

    const jsx = await AdminLayout({ children: <div data-testid="admin-child">Content</div> });
    render(jsx);

    expect(screen.getAllByRole("navigation", { name: /admin navigation/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Dashboard" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Candidates" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Jobs" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Analytics" }).length).toBeGreaterThan(0);
    expect(screen.getByTestId("admin-child")).toBeInTheDocument();
  });
});
