import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: vi.fn(),
  fetchSignInMethodsForEmail: vi.fn(),
  sendEmailVerification: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock("@/firebase/config", () => ({
  auth: {},
}));

import { getSession } from "@/lib/session";
import RegisterPage from "./page";

const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/register page auth gate", () => {
  it("redirects to / when a session already exists (already authenticated)", async () => {
    mockGetSession.mockResolvedValue({ uid: "uid-1", email_verified: true } as never);

    await expect(RegisterPage()).rejects.toThrow("REDIRECT:/");
  });

  it("renders the RegisterForm when there is no session", async () => {
    mockGetSession.mockResolvedValue(null);

    const jsx = await RegisterPage();
    render(jsx);

    expect(screen.getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText("First Name")).toBeInTheDocument();
  });
});
