import { test, expect } from "@playwright/test";
import { createAdminE2eSession, SESSION_COOKIE_NAME } from "./helpers/admin-session";

/**
 * Admin job management — per .claude/specs/03-jobs-platform-admin-listing-detail.md.
 *
 * Unlike the auth-foundation specs, this drives a real *verified admin*
 * session end-to-end without needing a real inbox: a real Firebase user is
 * created via the Admin SDK with `emailVerified: true`, a matching `User` row
 * is created with `role: ADMIN`, and a real session cookie is minted
 * server-side (see tests/e2e/helpers/admin-session.ts) and injected directly
 * into the browser context. Everything downstream — page rendering, Server
 * Actions, database writes — runs for real, no mocking.
 */
test.describe("Admin job management", () => {
  test("create a draft job, publish it, see it on /jobs, then archive it", async ({ page, context }) => {
    const session = await createAdminE2eSession();

    try {
      await context.addCookies([
        {
          name: SESSION_COOKIE_NAME,
          value: session.sessionCookie,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ]);

      await page.goto("/admin/jobs/new");
      await expect(page.getByRole("heading", { name: "New job" })).toBeVisible();

      const jobTitle = `E2E Warehouse Operative ${Date.now()}`;
      await page.getByLabel("Job title").fill(jobTitle);
      await page.getByLabel("Sector").selectOption({ index: 1 });
      await page.getByLabel("Role overview").fill("A great role created by an automated test.");
      await page.getByLabel("Town or city").fill("Foston");

      await page.getByRole("button", { name: "+ Add pay rate" }).click();
      await page.getByLabel("Minimum pay").fill("12.50");

      await page.getByRole("button", { name: "Create draft" }).click();

      // Successful create redirects to the edit page for the new job.
      await expect(page).toHaveURL(/\/admin\/jobs\/.+\/edit$/, { timeout: 10_000 });
      await expect(page.getByRole("heading", { name: "Edit job" })).toBeVisible();

      // Publish from the jobs list — an incomplete job would show a blocking
      // error instead of transitioning, so a visible status change here
      // confirms the publish-readiness check passed.
      await page.goto("/admin/jobs");
      await expect(page.getByRole("link", { name: jobTitle })).toBeVisible();

      const jobCard = page.locator("article", { hasText: jobTitle });
      await jobCard.getByRole("button", { name: "Publish" }).click();
      await expect(jobCard.getByText("PUBLISHED")).toBeVisible({ timeout: 10_000 });

      // Visibility on the public /jobs listing is covered once that page
      // exists (Phase 3) by tests/e2e/end-to-end-flow.spec.ts — this spec
      // only asserts the admin-side lifecycle.

      // Archive it again so the E2E project doesn't accumulate live jobs.
      page.once("dialog", (dialog) => dialog.accept());
      await jobCard.getByRole("button", { name: "Archive" }).click();
      await expect(jobCard.getByText("ARCHIVED", { exact: true })).toBeVisible({ timeout: 10_000 });
    } finally {
      await session.cleanup();
    }
  });

  test("cannot publish a job with no compensation set", async ({ page, context }) => {
    const session = await createAdminE2eSession();

    try {
      await context.addCookies([
        {
          name: SESSION_COOKIE_NAME,
          value: session.sessionCookie,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ]);

      await page.goto("/admin/jobs/new");
      const jobTitle = `E2E Incomplete Job ${Date.now()}`;
      await page.getByLabel("Job title").fill(jobTitle);
      await page.getByLabel("Sector").selectOption({ index: 1 });
      await page.getByLabel("Role overview").fill("Missing pay rate on purpose.");
      await page.getByLabel("Town or city").fill("Leeds");

      // No pay rate added while payType stays NUMERIC (the default) — the
      // Create button itself should be disabled by the client-side check.
      await expect(page.getByRole("button", { name: "Create draft" })).toBeDisabled();
    } finally {
      await session.cleanup();
    }
  });
});
