import { test, expect } from "@playwright/test";

/**
 * Admin route protection (src/proxy.ts + src/app/admin/layout.tsx) — per
 * .claude/specs/03-jobs-platform-admin-listing-detail.md.
 *
 * proxy.ts's edge check is presence-only (no session cookie => redirect to
 * /login), which is reachable and asserted here with a real navigation. The
 * "authenticated but not ADMIN" -> redirect to "/" branch requires a verified
 * Firebase session, which (per the same limitation documented in
 * auth-foundation.spec.ts) cannot be driven end-to-end without a real inbox —
 * it is covered instead at the unit level in
 * src/app/admin/layout.test.tsx ("redirects to / (not a 403) when the user is
 * authenticated but not an admin") and src/lib/require-admin-session.test.ts.
 */
test.describe("Admin route protection", () => {
  test("unauthenticated visit to /admin redirects to /login", async ({ page }) => {
    const response = await page.goto("/admin");

    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("unauthenticated visit to a nested /admin route redirects to /login", async ({ page }) => {
    await page.goto("/admin/jobs");
    await expect(page).toHaveURL(/\/login$/);
  });
});
