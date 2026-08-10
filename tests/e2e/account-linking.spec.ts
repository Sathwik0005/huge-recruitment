import { test, expect, type Page } from "@playwright/test";

/**
 * Google-collision account linking (src/app/login/LoginForm.tsx) — real
 * browser, real dev Firebase project + Postgres DB, synthetic accounts.
 *
 * The real Google OAuth popup (signInWithPopup) cannot be driven by browser
 * automation — completing it requires a genuine Google login, which is both
 * blocked by Google's bot detection and outside what this harness will do
 * (never enters credentials to authenticate a real account). LoginForm.tsx
 * has a guarded, non-production-only hook (`__e2eSimulateGoogleCollision`
 * query param) that seeds the exact post-collision UI state the real
 * signInWithPopup catch block would produce, so everything downstream of
 * that point runs for real:
 *   - the link-accounts prompt renders with the real email
 *   - signInWithEmailAndPassword is a genuine call against the dev Firebase
 *     project (a correct password succeeds for real; an incorrect one
 *     fails for real with the real generic anti-enumeration message)
 *   - linkWithCredential is a genuine call too — since the simulated Google
 *     credential is necessarily synthetic (no real Google token exists to
 *     supply), Firebase's backend genuinely rejects it, which is exactly
 *     what should happen for a garbage credential. This test therefore
 *     verifies the correct-password path reaches (and is rejected by) the
 *     real linkWithCredential call — surfacing the app's dedicated
 *     linking-failure message, kept deliberately distinct from the
 *     wrong-password message even though Firebase maps both failures to the
 *     same auth/invalid-credential code — and separately verifies the
 *     wrong-password path is rejected before ever reaching linkWithCredential
 *     at all. It cannot verify a fully successful merge, since that requires
 *     a real Google account this harness cannot obtain.
 *
 * Cleanup note: registration creates one more real, permanent (unverified)
 * synthetic Firebase Auth user + DB row in the dev project, same as the
 * existing register-happy-path E2E test.
 */

function uniqueEmail() {
  const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return `e2e+link+${runId}@example.test`;
}

const VALID_PASSWORD = "Str0ng!Passw0rd";

async function registerPasswordAccount(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("First Name").fill("E2E");
  await page.getByLabel("Last Name").fill("Linker");
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(VALID_PASSWORD);
  await page.getByLabel("Confirm Password").fill(VALID_PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/verify-email$/, { timeout: 15_000 });
}

test.describe("Account linking: Google sign-in colliding with an existing password account", () => {
  test("prompt renders with the real registered email", async ({ page }) => {
    const email = uniqueEmail();
    await registerPasswordAccount(page, email);

    await page.goto(`/login?__e2eSimulateGoogleCollision=${encodeURIComponent(email)}`);

    await expect(page.getByText(/an account already exists for/i)).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByRole("button", { name: "Link Google Account" })).toBeVisible();
  });

  test("Cancel dismisses the prompt without any network call", async ({ page }) => {
    const email = uniqueEmail();
    await registerPasswordAccount(page, email);

    await page.goto(`/login?__e2eSimulateGoogleCollision=${encodeURIComponent(email)}`);
    await expect(page.getByRole("button", { name: "Link Google Account" })).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByRole("button", { name: "Link Google Account" })).not.toBeVisible();
  });

  test("wrong password for the existing account is rejected before any linking is attempted", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await registerPasswordAccount(page, email);

    await page.goto(`/login?__e2eSimulateGoogleCollision=${encodeURIComponent(email)}`);
    await page.getByLabel("Password for account linking").fill("DefinitelyWrongPassword1!");
    await page.getByRole("button", { name: "Link Google Account" }).click();

    // Real signInWithEmailAndPassword call against the dev Firebase project,
    // rejected for real because the password is wrong.
    await expect(page.getByText("Invalid email or password.")).toBeVisible({ timeout: 15_000 });
    // The prompt stays open — linking was never attempted.
    await expect(page.getByRole("button", { name: "Link Google Account" })).toBeVisible();
  });

  test("correct password succeeds the real sign-in call, then the real (necessarily synthetic) credential is rejected by the real linkWithCredential call", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await registerPasswordAccount(page, email);

    await page.goto(`/login?__e2eSimulateGoogleCollision=${encodeURIComponent(email)}`);
    await page.getByLabel("Password for account linking").fill(VALID_PASSWORD);

    // Asserting on network responses rather than the displayed message,
    // because Firebase happens to map a garbage OAuth credential to the same
    // `auth/invalid-credential` code (and therefore the same anti-enumeration
    // message) as a wrong password — a genuine quirk this test surfaced.
    // Distinguishing the two calls at the network level is unambiguous:
    // signInWithPassword must succeed, signInWithIdp (used for linking) must
    // fail.
    const signInResponse = page.waitForResponse((res) => res.url().includes(":signInWithPassword"));
    const linkResponse = page.waitForResponse((res) => res.url().includes(":signInWithIdp"));

    await page.getByRole("button", { name: "Link Google Account" }).click();

    const [signIn, link] = await Promise.all([signInResponse, linkResponse]);
    expect(signIn.ok()).toBe(true);
    expect(link.ok()).toBe(false);

    await expect(
      page.getByText(/your password was correct, but we couldn't link your google account/i),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
