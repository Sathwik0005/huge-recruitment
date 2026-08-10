import { test, expect, type Page } from "@playwright/test";

/**
 * Auth foundation (register / verify-email / login / forgot-password) —
 * per .claude/specs/01-auth-foundation.md.
 *
 * These specs drive real Firebase Auth (client SDK, dev project) with
 * synthetic, unique-per-run accounts. There is no mocking layer at this
 * level, so:
 *   - Journeys that require possessing a *verified* Firebase account
 *     (verify-email success -> "/", login with a verified account -> "/",
 *     Google sign-in) cannot be driven end-to-end without a real inbox /
 *     real Google credentials, and are intentionally NOT covered here. They
 *     are exercised at the unit level (see src/app/page.test.tsx,
 *     src/app/login/LoginForm.test.tsx, src/lib/require-verified-session.test.ts)
 *     with a mocked session/Firebase layer instead.
 *   - What IS reachable and asserted here: page rendering, client-side
 *     validation feedback, cross-page navigation, the register happy path up
 *     to (and including) landing on /verify-email with a freshly created,
 *     unverified Firebase account, and the generic/anti-enumeration behavior
 *     of forgot-password.
 *
 * Cleanup note: accounts created by the register-happy-path test are real,
 * permanent (unverified) Firebase Auth users + DB rows in the dev project —
 * there is no delete-account UI yet to clean them up via the browser, so per
 * the safety rules this is called out here rather than silently left
 * unaddressed. Emails are synthetic (`example.test`) and timestamp-unique so
 * they never collide with real people or other runs.
 */

function uniqueEmail() {
  const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return `e2e+${runId}@example.test`;
}

const VALID_PASSWORD = "Str0ng!Passw0rd";

async function fillRegisterForm(
  page: Page,
  opts: { firstName: string; lastName: string; email: string; password: string; confirmPassword: string }
) {
  await page.getByLabel("First Name").fill(opts.firstName);
  await page.getByLabel("Last Name").fill(opts.lastName);
  await page.getByLabel("Email Address").fill(opts.email);
  await page.getByLabel("Password", { exact: true }).fill(opts.password);
  await page.getByLabel("Confirm Password").fill(opts.confirmPassword);
}

test.describe("Register page", () => {
  test("renders the expected form landmarks", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(page.getByLabel("First Name")).toBeVisible();
    await expect(page.getByLabel("Last Name")).toBeVisible();
    await expect(page.getByLabel("Email Address")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Confirm Password")).toBeVisible();
    await expect(page.getByRole("checkbox")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  test("submitting an empty form shows inline validation errors and does not navigate away", async ({
    page,
  }) => {
    await page.goto("/register");

    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByText("First name is required.")).toBeVisible();
    await expect(page.getByText("Last name is required.")).toBeVisible();
    await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
    await expect(page.getByText("You must accept the terms to continue.")).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test("mismatched passwords surface a distinct confirm-password error", async ({ page }) => {
    await page.goto("/register");

    await fillRegisterForm(page, {
      firstName: "E2E",
      lastName: "Tester",
      email: uniqueEmail(),
      password: VALID_PASSWORD,
      confirmPassword: "SomethingElse1!",
    });
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByText("Passwords do not match.")).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test("a weak password is rejected client-side before any account is created", async ({ page }) => {
    await page.goto("/register");

    await fillRegisterForm(page, {
      firstName: "E2E",
      lastName: "Tester",
      email: uniqueEmail(),
      password: "weak",
      confirmPassword: "weak",
    });
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByText("Password must be at least 8 characters long.")).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test("register happy path: valid new account reaches /verify-email", async ({ page }) => {
    const email = uniqueEmail();

    await page.goto("/register");
    await fillRegisterForm(page, {
      firstName: "E2E",
      lastName: "Tester",
      email,
      password: VALID_PASSWORD,
      confirmPassword: VALID_PASSWORD,
    });
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page).toHaveURL(/\/verify-email$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
    // Cross-page state: the email entered at registration is reflected on verify-email.
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByRole("button", { name: "I've Verified My Email" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Resend Email/ })).toBeVisible();
  });

  test("registering twice with the same email is blocked by the pre-check on the second attempt", async ({
    page,
  }) => {
    const email = uniqueEmail();
    const details = {
      firstName: "E2E",
      lastName: "Tester",
      email,
      password: VALID_PASSWORD,
      confirmPassword: VALID_PASSWORD,
    };

    // First registration succeeds and reaches /verify-email.
    await page.goto("/register");
    await fillRegisterForm(page, details);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(page).toHaveURL(/\/verify-email$/, { timeout: 15_000 });

    // /register's own auth gate only checks the server session cookie, which
    // registration never sets (decision #1) — so re-visiting /register here
    // renders the form again regardless of the still-signed-in client SDK
    // state, and the second submit's fetchSignInMethodsForEmail pre-check is
    // what should block the duplicate.
    await page.goto("/register");

    await fillRegisterForm(page, details);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByText("An account with this email already exists.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/register$/);
  });
});

test.describe("Login page", () => {
  test("renders the expected form landmarks", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByLabel("Email Address")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Forgot Password?" })).toHaveAttribute(
      "href",
      "/forgot-password"
    );
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Register now" })).toHaveAttribute("href", "/register");
  });

  test("submitting with empty fields shows a required-fields error and stays on /login", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Email and password are required.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("invalid credentials show a generic error, not a crash", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email Address").fill(uniqueEmail());
    await page.getByLabel("Password", { exact: true }).fill("WrongPassword1!");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Firebase returns a distinguishable auth error for a nonexistent/invalid
    // credential pair; the page must surface *some* inline error and stay put.
    await expect(page.locator("form p")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("Forgot password page", () => {
  test("renders the expected form landmarks and links back to /login", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await expect(page.getByLabel("Email Address")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send Reset Link" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  test("submitting with no email shows a required error", async ({ page }) => {
    await page.goto("/forgot-password");

    await page.getByRole("button", { name: "Send Reset Link" }).click();

    await expect(page.getByText("Email is required.")).toBeVisible();
  });

  test("unknown email shows the same generic success message as a real account (anti-enumeration)", async ({
    page,
  }) => {
    await page.goto("/forgot-password");

    await page.getByLabel("Email Address").fill(uniqueEmail());
    await page.getByRole("button", { name: "Send Reset Link" }).click();

    await expect(
      page.getByText("If an account exists for that email, we've sent a password reset link. Check your inbox.")
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Verify-email page", () => {
  test("visiting directly with no active Firebase session redirects to /register", async ({ page }) => {
    // A brand-new browser context (no prior sign-in in this test) has no
    // Firebase auth state, so the client-side guard on /verify-email should
    // send the visitor back to /register rather than rendering the prompt.
    await page.goto("/verify-email");

    await expect(page).toHaveURL(/\/register$/, { timeout: 10_000 });
  });
});

test.describe("Cross-page navigation between auth pages", () => {
  test("register -> login -> forgot-password -> login link chain works", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByRole("link", { name: "Forgot Password?" }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);

    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByRole("link", { name: "Register now" }).click();
    await expect(page).toHaveURL(/\/register$/);
  });
});
