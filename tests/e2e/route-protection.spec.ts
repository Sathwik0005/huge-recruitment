import { test, expect } from "@playwright/test";

/**
 * Route protection (src/proxy.ts) — per .claude/specs/01-auth-foundation.md:
 * "/" redirects to "/login" (unauthenticated/no session cookie).
 *
 * This is a pure browser-level concern: proxy.ts runs at the edge and issues a
 * real HTTP redirect that only a real navigation can observe (URL change,
 * final rendered page) — not something a component-level Vitest test can see.
 */
test.describe("Route protection", () => {
  test("unauthenticated visit to / redirects to /login", async ({ page }) => {
    const response = await page.goto("/");

    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/login$/);
    // Confirm we actually landed on the real login page, not just the URL.
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("unauthenticated visit to / with a trailing query string still redirects to /login", async ({
    page,
  }) => {
    await page.goto("/?foo=bar");
    await expect(page).toHaveURL(/\/login$/);
  });
});
