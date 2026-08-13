import { test, expect } from "@playwright/test";
import { createAdminE2eSession, SESSION_COOKIE_NAME } from "./helpers/admin-session";

/**
 * Admin panel (redesign + consolidation) — per .claude/specs/04-admin-panel.md.
 *
 * Drives a real *verified admin* session end-to-end the same way
 * admin-jobs.spec.ts does (see tests/e2e/helpers/admin-session.ts): a real
 * Firebase user + `User` row with role: ADMIN is created via the Admin SDK
 * and a real session cookie is injected directly into the browser context.
 * Everything downstream (page rendering, Server Actions, database writes)
 * runs for real against the dev DB/Firebase project — no mocking.
 *
 * What this file intentionally does NOT cover (already covered elsewhere,
 * see the pointers below — not duplicated here):
 *   - Vitest already exhaustively covers deriveCandidateVerification for
 *     every ApplicationStatus value, every admin-metrics.ts aggregate
 *     (including zero-data edge cases), the CSV export's escaping/
 *     formula-injection guard, and admin-gate short-circuiting on every
 *     Server Action (src/lib/admin-metrics.test.ts,
 *     src/app/api/admin/candidates/export/route.test.ts,
 *     src/app/admin/clients/actions.test.ts,
 *     src/app/admin/candidates/actions.test.ts).
 *   - tests/e2e/admin-authorization.spec.ts already covers the unauthenticated
 *     -> /login redirect for /admin and /admin/jobs; this file extends that
 *     same real-browser check to the *new* routes this spec adds
 *     (/admin/candidates, /admin/analytics, /admin/clients) since those
 *     routes didn't exist when admin-authorization.spec.ts was written.
 *   - The "authenticated but not ADMIN" -> redirect to "/" branch requires a
 *     second real *verified* Firebase account signed in through the actual
 *     UI to be trustworthy as a browser-level check (rather than another
 *     admin-SDK-minted session, which wouldn't add anything a Vitest test on
 *     requireAdminSession doesn't already prove) and cannot be driven
 *     end-to-end without a real inbox, per the same limitation documented in
 *     auth-foundation.spec.ts and admin-authorization.spec.ts; it remains
 *     covered at the unit level (src/app/admin/layout.test.tsx,
 *     src/lib/require-admin-session.test.ts).
 *   - admin-jobs.spec.ts already covers the full create -> publish -> archive
 *     job lifecycle in depth; this file only exercises the pieces specific to
 *     spec 04 (card-grid tabs, ClientPicker) on top of that.
 */

test.describe("Admin shell navigation", () => {
  test("admin lands on the Dashboard and can navigate Dashboard -> Candidates -> Jobs -> Analytics via the sidebar", async ({
    page,
    context,
  }) => {
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

      await page.goto("/admin");
      await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

      // Admin shell is self-contained: exactly one <header> (AdminTopbar),
      // no public-site <footer> — the root layout's public Header/Footer
      // must not render inside /admin/**.
      await expect(page.locator("header")).toHaveCount(1);
      await expect(page.locator("footer")).toHaveCount(0);

      // Sidebar renders twice in the DOM (desktop + mobile drawer); the
      // desktop one is first and is the one visible at this viewport size.
      const sidebarNav = page.getByRole("navigation", { name: "Admin navigation" }).first();
      await expect(sidebarNav.getByRole("link", { name: "Dashboard" })).toHaveClass(/text-primary/);
      await expect(sidebarNav.getByRole("link", { name: "Candidates" })).not.toHaveClass(/text-primary/);

      // Dashboard -> Candidates
      await sidebarNav.getByRole("link", { name: "Candidates" }).click();
      await expect(page).toHaveURL(/\/admin\/candidates$/);
      await expect(page.getByRole("heading", { name: "Candidates" })).toBeVisible();
      await expect(sidebarNav.getByRole("link", { name: "Candidates" })).toHaveClass(/text-primary/);
      await expect(sidebarNav.getByRole("link", { name: "Dashboard" })).not.toHaveClass(/text-primary/);

      // Candidates -> Jobs
      await sidebarNav.getByRole("link", { name: "Jobs" }).click();
      await expect(page).toHaveURL(/\/admin\/jobs$/);
      await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
      await expect(sidebarNav.getByRole("link", { name: "Jobs" })).toHaveClass(/text-primary/);

      // Jobs -> Analytics
      await sidebarNav.getByRole("link", { name: "Analytics" }).click();
      await expect(page).toHaveURL(/\/admin\/analytics$/);
      await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
      await expect(sidebarNav.getByRole("link", { name: "Analytics" })).toHaveClass(/text-primary/);
    } finally {
      await session.cleanup();
    }
  });
});

test.describe("Admin route protection for the new spec-04 routes", () => {
  for (const path of ["/admin/candidates", "/admin/analytics", "/admin/clients"]) {
    test(`unauthenticated visit to ${path} redirects to /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    });
  }
});

test.describe("Candidates filter + detail flow", () => {
  test("search and status-filter the candidates table, then open a candidate's detail page", async ({
    page,
    browser,
  }) => {
    test.setTimeout(60_000);
    const session = await createAdminE2eSession();
    const jobTitle = `E2E Candidates Filter Job ${Date.now()}`;
    const candidateName = "E2E Filter Candidate";
    const candidateEmail = `e2e+candfilter-${Date.now()}@example.test`;

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

      // Create + publish a job so there's somewhere real to apply to.
      await adminPage.goto("/admin/jobs/new");
      await adminPage.getByLabel("Job title").fill(jobTitle);
      await adminPage.getByLabel("Sector").selectOption({ label: "Manufacturing" });
      await adminPage.getByLabel("Role overview").fill("Job used to exercise the Candidates filter bar.");
      await adminPage.getByLabel("Town or city").fill("Derby");
      await adminPage.getByRole("button", { name: "+ Add pay rate" }).click();
      await adminPage.getByLabel("Minimum pay").fill("14.00");
      await adminPage.getByRole("button", { name: "Create draft" }).click();
      await expect(adminPage).toHaveURL(/\/admin\/jobs\/.+\/edit$/, { timeout: 10_000 });

      await adminPage.goto("/admin/jobs");
      const jobCard = adminPage.locator("article", { hasText: jobTitle });
      await jobCard.getByRole("button", { name: "Publish" }).click();
      await expect(jobCard.getByText("PUBLISHED", { exact: true })).toBeVisible({ timeout: 10_000 });

      // Guest applies (no admin session) — a real new JobApplication row.
      await page.goto("/jobs");
      await page.getByText(jobTitle).click();
      await expect(page.getByRole("heading", { name: jobTitle, level: 1 })).toBeVisible();
      await page.getByLabel(/Full name/).fill(candidateName);
      await page.getByLabel(/Email address/).fill(candidateEmail);
      await page.getByLabel(/Phone number/).fill("07111222333");
      await page.getByLabel(/Current location/).fill("Derby");
      await page.getByRole("checkbox", { name: /Privacy Policy/ }).check();
      await page.getByRole("button", { name: "Submit application" }).click();
      await expect(page.getByText("Application received")).toBeVisible({ timeout: 15_000 });

      // Search filter: by the candidate's email.
      await adminPage.goto("/admin/candidates");
      await adminPage.getByLabel("Search", { exact: true }).fill(candidateEmail);
      await adminPage.getByRole("button", { name: "Search" }).click();
      const candidateRow = adminPage.locator("tr", { hasText: candidateEmail });
      await expect(candidateRow.getByText(candidateName)).toBeVisible({ timeout: 10_000 });

      // Combine with the derived-status filter: a fresh application is NEW,
      // which derives to "Pending" — it should still be visible.
      await adminPage.getByLabel("Status").selectOption({ label: "Pending" });
      await expect(candidateRow.getByText(candidateName)).toBeVisible({ timeout: 10_000 });
      await expect(candidateRow.getByText("Pending")).toBeVisible();

      // The "Verified" filter should now exclude this still-pending candidate.
      await adminPage.getByLabel("Status").selectOption({ label: "Verified" });
      await expect(adminPage.locator("tr", { hasText: candidateEmail })).toHaveCount(0);

      // Clear back to see the candidate again, then open the detail page.
      await adminPage.getByRole("button", { name: "Clear" }).click();
      await expect(adminPage).toHaveURL(/\/admin\/candidates$/);
      await adminPage.getByLabel("Search", { exact: true }).fill(candidateEmail);
      await adminPage.getByRole("button", { name: "Search" }).click();
      await adminPage.locator("tr", { hasText: candidateEmail }).getByText(candidateName).click();

      await expect(adminPage).toHaveURL(/\/admin\/candidates\/.+$/);
      await expect(adminPage.getByRole("heading", { name: candidateName })).toBeVisible();
      await expect(adminPage.getByText(candidateEmail)).toBeVisible();
      await expect(adminPage.getByText("Pending", { exact: true })).toBeVisible();
      await expect(adminPage.getByText("07111222333")).toBeVisible();
      // Per-row/detail status control (existing ApplicationStatusSelect, restyled).
      await expect(adminPage.getByRole("combobox")).toBeVisible();

      // Cleanup.
      await adminPage.goto("/admin/jobs");
      adminPage.once("dialog", (dialog) => dialog.accept());
      await jobCard.getByRole("button", { name: "Archive" }).click();
      await expect(jobCard.getByText("ARCHIVED", { exact: true })).toBeVisible({ timeout: 10_000 });
      // Note: the JobApplication row created by this test is left in place —
      // JobApplication rows are never deleted anywhere in this app (per
      // .claude/rules/database.md, "never hard-deleted"), so there is no
      // browser-driven way to remove it; it's synthetic (example.test email)
      // and harmless to leave, consistent with end-to-end-flow.spec.ts /
      // guest-application.spec.ts.
    } finally {
      await adminContext.close();
      await session.cleanup();
    }
  });
});

test.describe("Client (employer) CRUD + JobEditor round-trip", () => {
  test("create an employer, select it while creating a job, and see it persisted on reload", async ({
    page,
    context,
  }) => {
    test.setTimeout(60_000);
    const session = await createAdminE2eSession();
    const clientName = `E2E Employer ${Date.now()}`;
    const jobTitle = `E2E Client-Assigned Job ${Date.now()}`;

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

    try {
      // 1. Create the employer via /admin/clients.
      await page.goto("/admin/clients");
      await expect(page.getByRole("heading", { name: "Employers" })).toBeVisible();
      await page.getByLabel("New employer name").fill(clientName);
      await page.getByRole("button", { name: "Add employer" }).click();

      const clientRow = page.locator("tr", { hasText: clientName });
      await expect(clientRow.getByText("Active", { exact: true })).toBeVisible({ timeout: 10_000 });

      // 2. The new employer is reachable from JobEditor's "Manage employers"
      // link and selectable in the ClientPicker.
      await page.goto("/admin/jobs/new");
      await expect(page.getByRole("link", { name: "Manage employers" })).toHaveAttribute(
        "href",
        "/admin/clients"
      );

      await page.getByLabel("Job title").fill(jobTitle);
      await page.getByLabel("Sector").selectOption({ label: "Automotive" });
      await page.getByLabel("Role overview").fill("Job used to exercise the Client picker round-trip.");
      await page.getByLabel("Town or city").fill("Coventry");
      await page.getByRole("button", { name: "+ Add pay rate" }).click();
      await page.getByLabel("Minimum pay").fill("16.00");
      await page.getByLabel("Employer (internal, optional)").selectOption({ label: clientName });
      await page.getByRole("button", { name: "Create draft" }).click();

      await expect(page).toHaveURL(/\/admin\/jobs\/.+\/edit$/, { timeout: 10_000 });

      // 3. Round-trip: the saved job, reloaded fresh from the server, still
      // shows the employer selected.
      await page.reload();
      const selectedEmployerLabel = await page
        .locator("#clientId")
        .evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent);
      expect(selectedEmployerLabel).toBe(clientName);

      // 4. Analytics's Total Active Employers widget renders real data (not
      // permanently zero, decision 13) now that a client exists — the exact
      // aggregate math is covered by src/lib/admin-metrics.test.ts; here we
      // only confirm the widget is reachable and rendered in a real browser.
      await page.goto("/admin/analytics");
      await expect(page.getByText("Total Active Employers")).toBeVisible();

      // Cleanup: the job was only ever "Create draft"-ed, never published —
      // JobStatusActions only renders "Archive" for PUBLISHED/PAUSED/CLOSED
      // jobs, so publish first before archiving. Then deactivate the employer
      // (never hard-deleted, mirrors the Sector pattern — see
      // admin/clients/actions.ts).
      await page.goto("/admin/jobs");
      const jobCard = page.locator("article", { hasText: jobTitle });
      await jobCard.getByRole("button", { name: "Publish" }).click();
      await expect(jobCard.getByText("PUBLISHED", { exact: true })).toBeVisible({ timeout: 10_000 });
      page.once("dialog", (dialog) => dialog.accept());
      await jobCard.getByRole("button", { name: "Archive" }).click();
      await expect(jobCard.getByText("ARCHIVED", { exact: true })).toBeVisible({ timeout: 10_000 });

      await page.goto("/admin/clients");
      await page.locator("tr", { hasText: clientName }).getByRole("button", { name: "Deactivate" }).click();
      await expect(page.locator("tr", { hasText: clientName }).getByText("Inactive")).toBeVisible({
        timeout: 10_000,
      });
    } finally {
      await session.cleanup();
    }
  });
});

test.describe("Jobs page status tabs", () => {
  test("clicking a status tab filters the visible job cards to that status", async ({ page, context }) => {
    test.setTimeout(60_000);
    const session = await createAdminE2eSession();
    const jobTitle = `E2E Tabs Draft Job ${Date.now()}`;

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

    try {
      // Create a job and leave it as DRAFT (never publish it).
      await page.goto("/admin/jobs/new");
      await page.getByLabel("Job title").fill(jobTitle);
      await page.getByLabel("Sector").selectOption({ label: "Production" });
      await page.getByLabel("Role overview").fill("Job used to exercise the Jobs page status tabs.");
      await page.getByLabel("Town or city").fill("Sheffield");
      await page.getByRole("button", { name: "+ Add pay rate" }).click();
      await page.getByLabel("Minimum pay").fill("11.50");
      await page.getByRole("button", { name: "Create draft" }).click();
      await expect(page).toHaveURL(/\/admin\/jobs\/.+\/edit$/, { timeout: 10_000 });

      await page.goto("/admin/jobs");
      // Real enum tabs, "All" first (decision 10) — not the reference's
      // Active/Draft/Closed/Expired set.
      await expect(page.getByRole("link", { name: /^All \(/ })).toBeVisible();
      await expect(page.getByRole("link", { name: /^DRAFT \(/ })).toBeVisible();
      await expect(page.getByRole("link", { name: /^PUBLISHED \(/ })).toBeVisible();
      await expect(page.getByRole("link", { name: /^PAUSED \(/ })).toBeVisible();
      await expect(page.getByRole("link", { name: /^CLOSED \(/ })).toBeVisible();
      await expect(page.getByRole("link", { name: /^ARCHIVED \(/ })).toBeVisible();

      // On "All", the draft job is visible.
      await expect(page.getByRole("link", { name: jobTitle })).toBeVisible();

      // The "Published" tab must not show a job that's still a draft.
      await page.getByRole("link", { name: /^PUBLISHED \(/ }).click();
      await expect(page).toHaveURL(/status=PUBLISHED/);
      await expect(page.getByRole("link", { name: jobTitle })).toHaveCount(0);

      // The "Draft" tab must show it.
      await page.getByRole("link", { name: /^DRAFT \(/ }).click();
      await expect(page).toHaveURL(/status=DRAFT/);
      await expect(page.getByRole("link", { name: jobTitle })).toBeVisible();

      // Back to "All" shows it again.
      await page.getByRole("link", { name: /^All \(/ }).click();
      await expect(page.getByRole("link", { name: jobTitle })).toBeVisible();

      // Cleanup: the job is still DRAFT at this point (that's the point of the
      // test) — JobStatusActions only renders "Archive" for
      // PUBLISHED/PAUSED/CLOSED jobs, so publish first before archiving.
      const jobCard = page.locator("article", { hasText: jobTitle });
      await jobCard.getByRole("button", { name: "Publish" }).click();
      await expect(jobCard.getByText("PUBLISHED", { exact: true })).toBeVisible({ timeout: 10_000 });
      page.once("dialog", (dialog) => dialog.accept());
      await jobCard.getByRole("button", { name: "Archive" }).click();
      await expect(jobCard.getByText("ARCHIVED", { exact: true })).toBeVisible({ timeout: 10_000 });
    } finally {
      await session.cleanup();
    }
  });
});
