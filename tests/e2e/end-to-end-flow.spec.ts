import { test, expect } from "@playwright/test";
import { createAdminE2eSession, SESSION_COOKIE_NAME } from "./helpers/admin-session";

/**
 * The Definition of Done's combined-flow requirement: admin create -> publish
 * -> visible on /jobs -> guest applies -> admin sees application. All the
 * individual pieces are covered in more depth by admin-jobs.spec.ts,
 * jobs-listing.spec.ts, and guest-application.spec.ts — this spec exists to
 * assert the full chain works together in one continuous run.
 */
test.describe("End-to-end: create -> publish -> apply -> review", () => {
  test("a job created by an admin can be found and applied to by a guest, then reviewed by the admin", async ({
    page,
    browser,
  }) => {
    test.setTimeout(60_000);
    const session = await createAdminE2eSession();
    const jobTitle = `E2E Full Flow ${Date.now()}`;

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

    try {
      const adminPage = await adminContext.newPage();

      // 1. Admin creates and publishes.
      await adminPage.goto("/admin/jobs/new");
      await adminPage.getByLabel("Job title").fill(jobTitle);
      await adminPage.getByLabel("Sector").selectOption({ label: "Distribution" });
      await adminPage.getByLabel("Role overview").fill("Full-flow automated test job.");
      await adminPage.getByLabel("Town or city").fill("Doncaster");
      await adminPage.getByRole("button", { name: "+ Add pay rate" }).click();
      await adminPage.getByLabel("Minimum pay").fill("15.00");
      await adminPage.getByRole("button", { name: "Create draft" }).click();
      await expect(adminPage).toHaveURL(/\/admin\/jobs\/.+\/edit$/, { timeout: 10_000 });

      await adminPage.goto("/admin/jobs");
      const jobCard = adminPage.locator("article", { hasText: jobTitle });
      await jobCard.getByRole("button", { name: "Publish" }).click();
      await expect(jobCard.getByText("PUBLISHED", { exact: true })).toBeVisible({ timeout: 10_000 });

      // 2. Visible on the public listing.
      await page.goto("/jobs");
      await expect(page.getByText(jobTitle)).toBeVisible({ timeout: 10_000 });
      await page.getByText(jobTitle).click();
      await expect(page.getByRole("heading", { name: jobTitle, level: 1 })).toBeVisible();

      // 3. Guest applies (no CV, to exercise the optional-CV path).
      await page.getByLabel(/Full name/).fill("Full Flow Candidate");
      await page.getByLabel(/Email address/).fill(`e2e+fullflow-${Date.now()}@example.test`);
      await page.getByLabel(/Phone number/).fill("07999888777");
      await page.getByLabel(/Current location/).fill("Doncaster");
      await page.getByRole("checkbox", { name: /Privacy Policy/ }).check();
      await page.getByRole("button", { name: "Submit application" }).click();
      await expect(page.getByText("Application received")).toBeVisible({ timeout: 15_000 });

      // 4. Admin reviews it.
      await adminPage.goto("/admin/candidates");
      const applicationRow = adminPage.locator("tr", { hasText: jobTitle });
      await expect(applicationRow.getByText("Full Flow Candidate")).toBeVisible({ timeout: 10_000 });

      // Cleanup.
      await adminPage.goto("/admin/jobs");
      adminPage.once("dialog", (dialog) => dialog.accept());
      await jobCard.getByRole("button", { name: "Archive" }).click();
      await expect(jobCard.getByText("ARCHIVED", { exact: true })).toBeVisible({ timeout: 10_000 });
    } finally {
      await adminContext.close();
      await session.cleanup();
    }
  });
});
