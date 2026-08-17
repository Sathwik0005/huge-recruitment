import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const refreshMock = vi.fn();
let searchParamsValue = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, refresh: refreshMock }),
  useSearchParams: () => searchParamsValue,
}));

const mockOnAuthStateChanged = vi.fn();
const mockReload = vi.fn();
const mockCheckActionCode = vi.fn();
const mockApplyActionCode = vi.fn();

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  reload: (...args: unknown[]) => mockReload(...args),
  checkActionCode: (...args: unknown[]) => mockCheckActionCode(...args),
  applyActionCode: (...args: unknown[]) => mockApplyActionCode(...args),
}));

const authMock = vi.hoisted(
  () =>
    ({ currentUser: null, authStateReady: vi.fn().mockResolvedValue(undefined) }) as {
      currentUser: { email: string; emailVerified?: boolean; getIdToken: ReturnType<typeof vi.fn> } | null;
      authStateReady: ReturnType<typeof vi.fn>;
    },
);

vi.mock("@/firebase/config", () => ({
  auth: authMock,
}));

import VerifyEmailPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
  searchParamsValue = new URLSearchParams();
  authMock.currentUser = null;
  mockOnAuthStateChanged.mockImplementation(() => () => {});
});

describe("VerifyEmailPage — check-email state (no action code)", () => {
  it("renders the check-your-email state with the signed-in user's email", async () => {
    const fakeUser = { email: "ann@example.com", getIdToken: vi.fn() };
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(fakeUser);
      return () => {};
    });

    render(<VerifyEmailPage />);

    expect(await screen.findByText("ann@example.com")).toBeInTheDocument();
  });

  it("resend button calls /api/auth/send-verification-email with a fresh ID token and starts a cooldown", async () => {
    const fakeUser = { email: "ann@example.com", getIdToken: vi.fn().mockResolvedValue("id-token") };
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(fakeUser);
      return () => {};
    });
    authMock.currentUser = fakeUser;
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

    const user = userEvent.setup();
    render(<VerifyEmailPage />);
    await user.click(await screen.findByRole("button", { name: /resend email/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/send-verification-email",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ idToken: "id-token" }) }),
      ),
    );
    expect(await screen.findByText(/resend available in/i)).toBeInTheDocument();
  });

  it("'I've already verified' fallback shows a not-yet-verified message when reload() still reports unverified", async () => {
    const fakeUser = { email: "ann@example.com", emailVerified: false, getIdToken: vi.fn() };
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(fakeUser);
      return () => {};
    });
    authMock.currentUser = fakeUser;
    mockReload.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<VerifyEmailPage />);
    await user.click(await screen.findByRole("button", { name: /i've already verified/i }));

    expect(await screen.findByText(/still not verified/i)).toBeInTheDocument();
  });

  it("'I've already verified' fallback mints a session and redirects+refreshes when reload() reports verified", async () => {
    const fakeUser: { email: string; emailVerified: boolean; getIdToken: ReturnType<typeof vi.fn> } = {
      email: "ann@example.com",
      emailVerified: false,
      getIdToken: vi.fn().mockResolvedValue("fresh-token"),
    };
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(fakeUser);
      return () => {};
    });
    authMock.currentUser = fakeUser;
    mockReload.mockImplementation(async () => {
      fakeUser.emailVerified = true;
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ user: {} }) });

    const user = userEvent.setup();
    render(<VerifyEmailPage />);
    await user.click(await screen.findByRole("button", { name: /i've already verified/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
    expect(refreshMock).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/session",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ idToken: "fresh-token" }) }),
    );
  });
});

describe("VerifyEmailPage — action-code handler (mode=verifyEmail&oobCode=...)", () => {
  it("shows the auth-themed processing state, with no button rendered, while verification is in flight", async () => {
    searchParamsValue = new URLSearchParams({ mode: "verifyEmail", oobCode: "abc123" });
    mockCheckActionCode.mockImplementation(() => new Promise(() => {})); // never resolves

    const { container } = render(<VerifyEmailPage />);

    expect(await screen.findByText("Verifying your email address")).toBeInTheDocument();
    expect(screen.getByText("Please wait while we activate your account.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.querySelector(".bg-surface-container-lowest.border.rounded-xl")).toBeInTheDocument();
  });

  it("same-browser success: checkActionCode + applyActionCode + reload + /api/auth/session all run, then BOTH router.replace('/') and router.refresh() are called (the header-refresh bug fix)", async () => {
    searchParamsValue = new URLSearchParams({ mode: "verifyEmail", oobCode: "abc123" });
    mockCheckActionCode.mockResolvedValue({ data: { email: "ann@example.com" } });
    mockApplyActionCode.mockResolvedValue(undefined);
    mockReload.mockResolvedValue(undefined);
    const fakeUser = { email: "ann@example.com", getIdToken: vi.fn().mockResolvedValue("fresh-token") };
    authMock.currentUser = fakeUser;
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ user: {} }) });

    render(<VerifyEmailPage />);

    await waitFor(() => expect(mockApplyActionCode).toHaveBeenCalledWith(authMock, "abc123"));
    await waitFor(() => expect(mockReload).toHaveBeenCalledWith(fakeUser));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
    expect(refreshMock).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/session",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ idToken: "fresh-token" }) }),
    );
    expect(pushMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalledWith("/verify-email");
  });

  it("different-browser success: no matching signed-in user -> POSTs /api/auth/verification-complete, auto-redirects to / without a button click, and never creates a session or calls router.refresh()", async () => {
    searchParamsValue = new URLSearchParams({ mode: "verifyEmail", oobCode: "abc123" });
    mockCheckActionCode.mockResolvedValue({ data: { email: "ann@example.com" } });
    mockApplyActionCode.mockResolvedValue(undefined);
    authMock.currentUser = null;
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

    render(<VerifyEmailPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/verification-complete",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "ann@example.com" }) }),
    );
    expect(global.fetch).not.toHaveBeenCalledWith("/api/auth/session", expect.anything());
    expect(refreshMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalledWith("/verify-email");
  });

  it("shows a friendly, auth-themed error state for an invalid action code, with links back to login and register", async () => {
    searchParamsValue = new URLSearchParams({ mode: "verifyEmail", oobCode: "bad-code" });
    mockCheckActionCode.mockRejectedValue({ code: "auth/invalid-action-code" });

    render(<VerifyEmailPage />);

    expect(
      await screen.findByText("This link is invalid or has already been used. Please request a new one."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to login/i })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /create a new account/i })).toHaveAttribute("href", "/register");
    expect(replaceMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows the expired-link message for an expired action code", async () => {
    searchParamsValue = new URLSearchParams({ mode: "verifyEmail", oobCode: "expired-code" });
    mockCheckActionCode.mockRejectedValue({ code: "auth/expired-action-code" });

    render(<VerifyEmailPage />);

    expect(await screen.findByText("This link has expired. Please request a new one.")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("shows an error state when applyActionCode itself rejects an already-used or malformed code, and there is no signed-in user to recover from", async () => {
    searchParamsValue = new URLSearchParams({ mode: "verifyEmail", oobCode: "already-used" });
    mockCheckActionCode.mockResolvedValue({ data: { email: "ann@example.com" } });
    mockApplyActionCode.mockRejectedValue({ code: "auth/invalid-action-code" });

    render(<VerifyEmailPage />);

    expect(
      await screen.findByText("This link is invalid or has already been used. Please request a new one."),
    ).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("regression: a second/duplicate applyActionCode() call that fails with auth/invalid-action-code does NOT show 'invalid link' when this browser's Firebase user is already verified — it mints a session and redirects home instead (proves the 'invalid link but logged in after refresh' contradiction is fixed)", async () => {
    searchParamsValue = new URLSearchParams({ mode: "verifyEmail", oobCode: "already-used" });
    mockCheckActionCode.mockResolvedValue({ data: { email: "ann@example.com" } });
    mockApplyActionCode.mockRejectedValue({ code: "auth/invalid-action-code" });
    const fakeUser = {
      email: "ann@example.com",
      emailVerified: true,
      getIdToken: vi.fn().mockResolvedValue("fresh-token"),
    };
    authMock.currentUser = fakeUser;
    mockReload.mockResolvedValue(undefined);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ user: {} }) });

    render(<VerifyEmailPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
    expect(refreshMock).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/session",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ idToken: "fresh-token" }) }),
    );
    expect(screen.queryByText("This link isn't valid")).not.toBeInTheDocument();
  });

  it("a second/duplicate applyActionCode() failure still shows the real error when the signed-in user is NOT actually verified", async () => {
    searchParamsValue = new URLSearchParams({ mode: "verifyEmail", oobCode: "already-used" });
    mockCheckActionCode.mockResolvedValue({ data: { email: "ann@example.com" } });
    mockApplyActionCode.mockRejectedValue({ code: "auth/invalid-action-code" });
    const fakeUser = {
      email: "ann@example.com",
      emailVerified: false,
      getIdToken: vi.fn(),
    };
    authMock.currentUser = fakeUser;
    mockReload.mockResolvedValue(undefined);

    render(<VerifyEmailPage />);

    expect(
      await screen.findByText("This link is invalid or has already been used. Please request a new one."),
    ).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("does not issue a second applyActionCode() call for the same mounted instance (duplicate-effect guard)", async () => {
    searchParamsValue = new URLSearchParams({ mode: "verifyEmail", oobCode: "abc123" });
    mockCheckActionCode.mockResolvedValue({ data: { email: "ann@example.com" } });
    mockApplyActionCode.mockResolvedValue(undefined);
    mockReload.mockResolvedValue(undefined);
    const fakeUser = { email: "ann@example.com", getIdToken: vi.fn().mockResolvedValue("fresh-token") };
    authMock.currentUser = fakeUser;
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ user: {} }) });

    render(<VerifyEmailPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
    expect(mockApplyActionCode).toHaveBeenCalledTimes(1);
  });
});
