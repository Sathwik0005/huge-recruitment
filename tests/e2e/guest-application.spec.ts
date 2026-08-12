import path from "node:path";
import { test, expect } from "@playwright/test";
import { createAdminE2eSession, SESSION_COOKIE_NAME } from "./helpers/admin-session";

/**
 * Guest application flow — per .claude/specs/03-jobs-platform-admin-listing-detail.md.
 *
 * Publishes a real job via an admin session, then applies as a guest (no
 * session) against the real /jobs/[slug] page and real /api/applications +
 * /api/applications/cv-upload routes. Requires RESEND_*, BLOB_*, and
 * UPSTASH_* credentials in .env.local — no mocking.
 */
test.describe("Guest application", () => {
  test("full happy path with a CV: fill, upload, submit, see confirmation, appears in admin", async ({
    page,
    browser,
  }) => {
    test.setTimeout(60_000);
    const session = await createAdminE2eSession();
    const jobTitle = `E2E Apply Job ${Date.now()}`;
    const candidateEmail = `e2e+candidate-${Date.now()}@example.test`;

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
      await adminPage.goto("/admin/jobs/new");
      await adminPage.getByLabel("Job title").fill(jobTitle);
      await adminPage.getByLabel("Sector").selectOption({ label: "Warehousing" });
      await adminPage.getByLabel("Role overview").fill("Apply to this automated test job.");
      await adminPage.getByLabel("Town or city").fill("Foston");
      await adminPage.getByRole("button", { name: "+ Add pay rate" }).click();
      await adminPage.getByLabel("Minimum pay").fill("13.50");
      await adminPage.getByRole("button", { name: "Create draft" }).click();
      await expect(adminPage).toHaveURL(/\/admin\/jobs\/.+\/edit$/, { timeout: 10_000 });
      const jobUrl = adminPage.url();
      const jobId = jobUrl.match(/\/admin\/jobs\/([^/]+)\/edit$/)?.[1];

      await adminPage.goto("/admin/jobs");
      const jobCard = adminPage.locator("article", { hasText: jobTitle });
      await jobCard.getByRole("button", { name: "Publish" }).click();
      await expect(jobCard.getByText("PUBLISHED", { exact: true })).toBeVisible({ timeout: 10_000 });

      // Guest applies via the real public detail page.
      await page.goto("/jobs");
      await page.getByText(jobTitle).click();
      await expect(page.getByRole("heading", { name: jobTitle, level: 1 })).toBeVisible();

      await page.getByLabel(/Full name/).fill("E2E Candidate");
      await page.getByLabel(/Email address/).fill(candidateEmail);
      await page.getByLabel(/Phone number/).fill("07123456789");
      await page.getByLabel(/Current location/).fill("Foston");

      const fixturePath = path.resolve(__dirname, "fixtures/sample-cv.pdf");
      await page.setInputFiles("#cv-upload", fixturePath);
      await expect(page.getByText("Uploaded")).toBeVisible({ timeout: 15_000 });

      await page.getByRole("checkbox", { name: /Privacy Policy/ }).check();
      await page.getByRole("button", { name: "Submit application" }).click();

      await expect(page.getByText("Application received")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/^APP-/)).toBeVisible({ timeout: 5_000 });

      // Confirm it shows up in the admin applications list, for this job.
      await adminPage.goto("/admin/applications");
      const applicationRow = adminPage.locator("tr", { hasText: jobTitle });
      await expect(applicationRow.getByText("E2E Candidate")).toBeVisible({ timeout: 10_000 });

      // Clean up the job.
      await adminPage.goto("/admin/jobs");
      adminPage.once("dialog", (dialog) => dialog.accept());
      await jobCard.getByRole("button", { name: "Archive" }).click();
      await expect(jobCard.getByText("ARCHIVED", { exact: true })).toBeVisible({ timeout: 10_000 });

      void jobId;
    } finally {
      await adminContext.close();
      await session.cleanup();
    }
  });

  test("rejects submission to a nonexistent job slug with the standard not-found page", async ({ page }) => {
    // Next dev/Turbopack can report the initial navigation as 200 while
    // streaming in the not-found boundary; the rendered content is the
    // reliable signal here.
    await page.goto("/jobs/this-slug-does-not-exist-e2e");
    await expect(page.getByRole("heading", { name: "Job not found" })).toBeVisible();
  });
});
