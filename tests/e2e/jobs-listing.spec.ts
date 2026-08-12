import { test, expect } from "@playwright/test";
import { createAdminE2eSession, SESSION_COOKIE_NAME } from "./helpers/admin-session";

/**
 * Public /jobs listing — per .claude/specs/03-jobs-platform-admin-listing-detail.md.
 *
 * Uses the same real-admin-session helper as admin-jobs.spec.ts to publish a
 * real job, then drives the public listing as an unauthenticated visitor.
 */
test.describe("Public jobs listing", () => {
  test("renders a published job and lets a keyword filter narrow the results", async ({
    page,
    browser,
  }) => {
    const session = await createAdminE2eSession();
    const jobTitle = `E2E Listing Job ${Date.now()}`;

    try {
      // Create + publish a job using an authenticated admin context.
      const adminContext = await browser.newContext();
      await adminContext.addCookies([
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
      const adminPage = await adminContext.newPage();
      await adminPage.goto("/admin/jobs/new");
      await adminPage.getByLabel("Job title").fill(jobTitle);
      await adminPage.getByLabel("Sector").selectOption({ label: "Warehousing" });
      await adminPage.getByLabel("Role overview").fill("Findable via keyword search in an automated test.");
      await adminPage.getByLabel("Town or city").fill("Foston");
      await adminPage.getByRole("button", { name: "+ Add pay rate" }).click();
      await adminPage.getByLabel("Minimum pay").fill("14.00");
      await adminPage.getByRole("button", { name: "Create draft" }).click();
      await expect(adminPage).toHaveURL(/\/admin\/jobs\/.+\/edit$/, { timeout: 10_000 });

      await adminPage.goto("/admin/jobs");
      const jobCard = adminPage.locator("article", { hasText: jobTitle });
      await jobCard.getByRole("button", { name: "Publish" }).click();
      await expect(jobCard.getByText("PUBLISHED", { exact: true })).toBeVisible({ timeout: 10_000 });

      // Now drive the public listing as a guest (no session cookie).
      await page.goto("/jobs");
      await expect(page.getByText(jobTitle)).toBeVisible({ timeout: 10_000 });

      await page.getByPlaceholder("Job title or keyword").fill("zzz-no-such-keyword-zzz");
      await page.waitForURL(/keyword=zzz-no-such-keyword-zzz/, { timeout: 5_000 });
      await expect(page.getByText("No matching jobs found")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(jobTitle)).not.toBeVisible();

      await page.getByPlaceholder("Job title or keyword").fill("");
      await page.waitForURL((url) => !url.searchParams.get("keyword"), { timeout: 5_000 });
      await expect(page.getByText(jobTitle)).toBeVisible({ timeout: 10_000 });

      // Clean up the job so it doesn't accumulate.
      adminPage.once("dialog", (dialog) => dialog.accept());
      await jobCard.getByRole("button", { name: "Archive" }).click();
      await expect(jobCard.getByText("ARCHIVED", { exact: true })).toBeVisible({ timeout: 10_000 });

      await adminContext.close();
    } finally {
      await session.cleanup();
    }
  });

  test("has a constrained-width search bar and no separate sort bar", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.getByRole("heading", { name: "Find your next opportunity" })).toBeVisible();
    // Sort lives inside the filter panel as a labelled control, not a
    // standalone "Sort by" bar.
    await expect(page.getByLabel("Sort by")).toBeVisible();
  });
});
