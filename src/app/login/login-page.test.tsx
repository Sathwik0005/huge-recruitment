import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
}));

vi.mock("@/firebase/config", () => ({
  auth: {},
}));

import { getSession } from "@/lib/session";
import LoginPage from "./page";

const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/login page auth gate", () => {
  it("redirects to / when a session already exists (already authenticated)", async () => {
    mockGetSession.mockResolvedValue({ uid: "uid-1", email_verified: true } as never);

    await expect(LoginPage()).rejects.toThrow("REDIRECT:/");
  });

  it("renders the LoginForm when there is no session", async () => {
    mockGetSession.mockResolvedValue(null);

    const jsx = await LoginPage();
    render(jsx);

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
  });
});
