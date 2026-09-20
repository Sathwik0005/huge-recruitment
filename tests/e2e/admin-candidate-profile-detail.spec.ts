import { test, expect, type Page, type Locator } from "@playwright/test";
import { createAdminE2eSession, SESSION_COOKIE_NAME } from "./helpers/admin-session";
import { createVerifiedCandidateE2eSession } from "./helpers/candidate-session";
import { createSeededCandidateProfile } from "./helpers/candidate-profile-session";

/**
 * Admin Candidate Profile CRUD — per
 * .claude/specs/08-admin-candidate-profile-crud.md.
 *
 * Drives a real admin session (see tests/e2e/helpers/admin-session.ts) against
 * a real, fully-populated `CandidateProfile` seeded directly via Prisma (see
 * tests/e2e/helpers/candidate-profile-session.ts) — no mocking, real routing,
 * real DB reads/writes through the actual Server Actions/API routes.
 *
 * What this file intentionally does NOT cover (already covered elsewhere, not
 * duplicated here):
 *   - Exhaustive validation-schema edge cases and admin-session-status
 *     enumeration for every Server Action/route — covered by
 *     src/lib/validation/admin-candidate-profile.test.ts,
 *     src/app/admin/candidate-profiles/[userId]/actions.test.ts, and the
 *     avatar/documents route test files (content-type/magic-byte/size
 *     rejection parity with the candidate-facing routes).
 *   - The "authenticated but not ADMIN" -> redirect to "/" branch: per the
 *     same documented limitation as admin-authorization.spec.ts/
 *     admin-panel.spec.ts, this requires a real verified (non-admin) Firebase
 *     session driven through the UI to be a meaningful browser-level check,
 *     and is instead covered at the unit level
 *     (src/lib/require-admin-session.test.ts, src/app/admin/layout.test.tsx).
 *   - Real S3-backed document upload/view: no real S3 test credentials are
 *     assumed in this environment. Document/avatar upload is exercised only
 *     as far as "the empty state renders correctly and Upload/Replace opens a
 *     real file picker" — not an actual successful upload + signed-URL fetch.
 *
 * Locates each independently-editable section by its heading text, since
 * every section card shares the same "Edit"/"Save"/"Cancel" button labels
 * (see PersonalInfoSection.tsx et al.) and would otherwise collide with
 * strict-mode locators.
 */
function sectionCard(page: Page, heading: string) {
  return page.locator(`xpath=//h2[normalize-space(text())="${heading}"]/ancestor::div[contains(@class,"space-y-4")][1]`);
}

/**
 * These edit-in-place forms render `<label>Some Label</label>` immediately
 * followed by its `<input>`/`<select>` as a plain sibling — with no `for`/`id`
 * pairing and no wrapping — unlike JobEditor.tsx's fields, which do use
 * `htmlFor`. That means `getByLabel` cannot resolve these controls (a real
 * accessibility gap worth flagging back to the team, per this task's
 * coverage checklist on accessibility landmarks), so this structural
 * fallback (label text -> its next sibling element) is used instead for the
 * candidate-profile section forms. Checkboxes that visually wrap their label
 * text (e.g. "This is their current job") do have a valid implicit
 * association and use the normal `getByRole("checkbox", { name })` instead.
 */
function fieldByLabel(container: Locator, label: string): Locator {
  return container.locator(`xpath=.//label[normalize-space(text())="${label}"]/following-sibling::*[1]`);
}

async function addAdminSessionCookie(context: import("@playwright/test").BrowserContext, sessionCookie: string) {
  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

test.describe("Admin candidate profile detail page", () => {
  test("admin opens a candidate from the list, sees real seeded data across every section, edits a field, and it persists after reload", async ({
    page,
    context,
  }) => {
    test.setTimeout(60_000);
    const adminSession = await createAdminE2eSession();
    const candidate = await createSeededCandidateProfile();

    try {
      await addAdminSessionCookie(context, adminSession.sessionCookie);

      // Navigate from the list page via "View profile" / the candidate name link.
      await page.goto("/admin/candidate-profiles");
      await page.getByLabel("Search", { exact: true }).fill(candidate.email);
      await page.getByRole("button", { name: "Search" }).click();
      const row = page.locator("tr", { hasText: candidate.email });
      await expect(row.getByText(candidate.fullName)).toBeVisible({ timeout: 10_000 });
      await row.getByRole("link", { name: "View profile" }).click();

      await expect(page).toHaveURL(new RegExp(`/admin/candidate-profiles/${candidate.userId}$`));
      await expect(page.getByRole("heading", { name: candidate.fullName })).toBeVisible();
      await expect(page.getByText(candidate.email)).toBeVisible();
      // step3CompletedAt is set -> "Submitted", and the pre-existing unlock
      // toggle is surfaced here too (decision 4), defaulting to "Allow Editing".
      await expect(page.getByText("Submitted", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Allow Editing" })).toBeVisible();

      // Personal Info section shows seeded step-1 data.
      const personalCard = sectionCard(page, "Personal Information");
      await expect(personalCard.getByText("MR", { exact: true })).toBeVisible();
      await expect(personalCard.getByText("GB", { exact: true })).toBeVisible();
      await expect(personalCard).toContainText("+44 7123456789");

      // Address section.
      const addressCard = sectionCard(page, "Address");
      await expect(addressCard).toContainText("1 Example Street");
      await expect(addressCard).toContainText("Manchester");
      await expect(addressCard).toContainText("M1 1AA");

      // Work Preferences section.
      const workPrefsCard = sectionCard(page, "Work Preferences");
      await expect(workPrefsCard).toContainText("Manchester, Leeds");

      // Work References section shows the seeded reference.
      const referencesCard = sectionCard(page, "Work References");
      await expect(referencesCard).toContainText("Warehouse Operative");
      await expect(referencesCard).toContainText("Example Logistics Ltd");

      // Right to Work: PASSPORT branch shows Visa Expiry Date + Share Code,
      // not the ID-card-only Share Code Expiry Date, and both document slots
      // report "Not uploaded" (no S3 key seeded).
      const rtwCard = sectionCard(page, "Right to Work");
      await expect(rtwCard).toContainText("PASSPORT");
      await expect(rtwCard).toContainText("AbC123XyZ");
      await expect(rtwCard.getByText("Not uploaded")).toHaveCount(2);

      // Bank Details: masked by default (decision 5).
      // "12345678" (8 chars) masks to "****5678", "123456" (6 chars) masks to "**3456".
      const bankCard = sectionCard(page, "Bank Details");
      await expect(bankCard.getByText("****5678")).toBeVisible();
      await expect(bankCard.getByText("**3456")).toBeVisible();
      await expect(bankCard.getByText("Not uploaded")).toBeVisible();

      // --- Edit Personal Info (a step-1 field) and confirm it persists. ---
      const updatedSurname = `Updated${Date.now()}`;
      await personalCard.getByRole("button", { name: "Edit" }).click();
      const surnameInput = fieldByLabel(personalCard, "Surname");
      await surnameInput.fill(updatedSurname);
      await personalCard.getByRole("button", { name: "Save" }).click();
      await expect(personalCard.getByRole("button", { name: "Edit" })).toBeVisible({ timeout: 10_000 });
      await expect(personalCard.getByText(updatedSurname)).toBeVisible();

      await page.reload();
      const personalCardAfterReload = sectionCard(page, "Personal Information");
      await expect(personalCardAfterReload.getByText(updatedSurname)).toBeVisible();
    } finally {
      await candidate.cleanup();
      await adminSession.cleanup();
    }
  });

  test("admin can add and then delete a work reference, with the change persisting after reload", async ({
    page,
    context,
  }) => {
    test.setTimeout(60_000);
    const adminSession = await createAdminE2eSession();
    const candidate = await createSeededCandidateProfile();

    try {
      await addAdminSessionCookie(context, adminSession.sessionCookie);
      await page.goto(`/admin/candidate-profiles/${candidate.userId}`);

      const referencesCard = sectionCard(page, "Work References");
      const newJobTitle = `E2E Added Role ${Date.now()}`;

      // Add a new reference.
      await referencesCard.getByRole("button", { name: "+ Add Reference" }).click();
      await fieldByLabel(referencesCard, "Job Title").fill(newJobTitle);
      await fieldByLabel(referencesCard, "Company Name").fill("E2E New Employer Ltd");
      await fieldByLabel(referencesCard, "Start Date").fill("2023-01-01");
      await referencesCard.getByRole("checkbox", { name: "This is their current job" }).check();
      await referencesCard.getByRole("button", { name: "Add" }).click();
      await expect(referencesCard).toContainText(newJobTitle);

      await referencesCard.getByRole("button", { name: "Save Changes" }).click();
      await expect(referencesCard.getByRole("button", { name: "Save Changes" })).toHaveCount(0, { timeout: 10_000 });

      await page.reload();
      const referencesCardAfterAdd = sectionCard(page, "Work References");
      await expect(referencesCardAfterAdd).toContainText(newJobTitle);
      // The originally-seeded reference is still present alongside the new one.
      await expect(referencesCardAfterAdd).toContainText("Warehouse Operative");

      // Delete the newly-added reference. Scope to the specific row div (it
      // contains both the new job title text and its own "Delete" button) —
      // several ancestor wrapper divs also technically "contain" this text,
      // so filter down to the smallest (innermost) match that also has a
      // Delete button as a direct descendant.
      const newRow = referencesCardAfterAdd
        .locator("div", { hasText: newJobTitle })
        .filter({ has: page.getByRole("button", { name: "Delete" }) })
        .last();
      await newRow.getByRole("button", { name: "Delete" }).click();
      await expect(referencesCardAfterAdd.getByRole("button", { name: "Save Changes" })).toBeVisible();
      await referencesCardAfterAdd.getByRole("button", { name: "Save Changes" }).click();
      await expect(referencesCardAfterAdd.getByRole("button", { name: "Save Changes" })).toHaveCount(0, {
        timeout: 10_000,
      });

      await page.reload();
      const referencesCardAfterDelete = sectionCard(page, "Work References");
      await expect(referencesCardAfterDelete).not.toContainText(newJobTitle);
      await expect(referencesCardAfterDelete).toContainText("Warehouse Operative");
    } finally {
      await candidate.cleanup();
      await adminSession.cleanup();
    }
  });

  test("masked NI number and bank fields render masked by default and reveal on Show / re-mask on Hide", async ({
    page,
    context,
  }) => {
    test.setTimeout(45_000);
    const adminSession = await createAdminE2eSession();
    const candidate = await createSeededCandidateProfile();

    try {
      await addAdminSessionCookie(context, adminSession.sessionCookie);
      await page.goto(`/admin/candidate-profiles/${candidate.userId}`);

      // NI Number: "QQ123456C" (9 chars) masks to "*****456C".
      const personalCard = sectionCard(page, "Personal Information");
      await expect(personalCard.getByText("QQ123456C")).toHaveCount(0);
      await expect(personalCard.getByText("*****456C")).toBeVisible();
      await personalCard.getByRole("button", { name: "Show" }).click();
      await expect(personalCard.getByText("QQ123456C")).toBeVisible();
      await personalCard.getByRole("button", { name: "Hide" }).click();
      await expect(personalCard.getByText("QQ123456C")).toHaveCount(0);
      await expect(personalCard.getByText("*****456C")).toBeVisible();

      // Bank Details: two masked fields (Account Number, Sort Code), each
      // with its own independent Show/Hide toggle — scoped to each field's
      // own wrapper (the innermost matching div) so the two toggles can't be
      // confused with each other.
      const bankCard = sectionCard(page, "Bank Details");
      const accountNumberField = bankCard.locator("div", { hasText: "Account Number" }).last();
      const sortCodeField = bankCard.locator("div", { hasText: "Sort Code" }).last();

      await expect(bankCard.getByText("12345678")).toHaveCount(0);
      await expect(bankCard.getByText("123456", { exact: true })).toHaveCount(0);

      await accountNumberField.getByRole("button", { name: "Show" }).click();
      await expect(accountNumberField.getByText("12345678")).toBeVisible();
      await accountNumberField.getByRole("button", { name: "Hide" }).click();
      await expect(bankCard.getByText("12345678")).toHaveCount(0);

      await sortCodeField.getByRole("button", { name: "Show" }).click();
      await expect(sortCodeField.getByText("123456", { exact: true })).toBeVisible();
      await sortCodeField.getByRole("button", { name: "Hide" }).click();
      await expect(bankCard.getByText("123456", { exact: true })).toHaveCount(0);
    } finally {
      await candidate.cleanup();
      await adminSession.cleanup();
    }
  });

  test("document 'Upload' control on an empty slot opens a real file picker", async ({ page, context }) => {
    test.setTimeout(45_000);
    const adminSession = await createAdminE2eSession();
    const candidate = await createSeededCandidateProfile();

    try {
      await addAdminSessionCookie(context, adminSession.sessionCookie);
      await page.goto(`/admin/candidate-profiles/${candidate.userId}`);

      const rtwCard = sectionCard(page, "Right to Work");
      await expect(rtwCard.getByText("Not uploaded")).toHaveCount(2);
      const uploadButtons = rtwCard.getByRole("button", { name: "Upload" });
      await expect(uploadButtons).toHaveCount(2);

      const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        uploadButtons.first().click(),
      ]);
      expect(fileChooser).toBeTruthy();

      // No document was actually selected/uploaded (no real S3 test
      // credentials in this environment, per the file-level doc comment) —
      // the slot remains "Not uploaded" after dismissing the picker.
      await expect(rtwCard.getByText("Not uploaded")).toHaveCount(2);
    } finally {
      await candidate.cleanup();
      await adminSession.cleanup();
    }
  });

  test("avatar falls back to the initials avatar when no avatarS3Key is set", async ({ page, context }) => {
    test.setTimeout(45_000);
    const adminSession = await createAdminE2eSession();
    const candidate = await createSeededCandidateProfile();

    try {
      await addAdminSessionCookie(context, adminSession.sessionCookie);
      await page.goto(`/admin/candidate-profiles/${candidate.userId}`);

      // No <img> avatar (AvatarEditor only renders one when a signed URL
      // exists) — the AdminInitialAvatar fallback renders instead, and
      // "Remove" is only shown when there's something to remove.
      await expect(page.locator("img[alt='']")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Replace" }).first()).toBeVisible();
    } finally {
      await candidate.cleanup();
      await adminSession.cleanup();
    }
  });

  test("Allow Editing / Re-lock toggle on the detail page still works", async ({ page, context }) => {
    test.setTimeout(45_000);
    const adminSession = await createAdminE2eSession();
    const candidate = await createSeededCandidateProfile();

    try {
      await addAdminSessionCookie(context, adminSession.sessionCookie);
      await page.goto(`/admin/candidate-profiles/${candidate.userId}`);

      await expect(page.getByRole("button", { name: "Allow Editing" })).toBeVisible();
      await page.getByRole("button", { name: "Allow Editing" }).click();
      await expect(page.getByRole("button", { name: "Re-lock" })).toBeVisible({ timeout: 10_000 });

      await page.reload();
      await expect(page.getByRole("button", { name: "Re-lock" })).toBeVisible();

      await page.getByRole("button", { name: "Re-lock" }).click();
      await expect(page.getByRole("button", { name: "Allow Editing" })).toBeVisible({ timeout: 10_000 });
    } finally {
      await candidate.cleanup();
      await adminSession.cleanup();
    }
  });

  test("404s for a userId with no candidateProfile, and for a userId that doesn't exist at all", async ({
    page,
    context,
  }) => {
    test.setTimeout(45_000);
    const adminSession = await createAdminE2eSession();
    // A real User row (role USER) that never went through the onboarding
    // wizard, so it has no CandidateProfile at all.
    const profilelessUser = await createVerifiedCandidateE2eSession();

    try {
      await addAdminSessionCookie(context, adminSession.sessionCookie);

      const responseNoProfile = await page.goto(`/admin/candidate-profiles/${profilelessUser.userId}`);
      expect(responseNoProfile?.status()).toBe(404);

      // A userId that doesn't correspond to any User row at all.
      const responseNoUser = await page.goto("/admin/candidate-profiles/clnonexistentuseridxxxxxxxx");
      expect(responseNoUser?.status()).toBe(404);
    } finally {
      await profilelessUser.cleanup();
      await adminSession.cleanup();
    }
  });
});

test.describe("Admin candidate profile detail route protection", () => {
  test("unauthenticated visit redirects to /login", async ({ page }) => {
    // src/proxy.ts's edge check is presence-of-cookie only and runs before any
    // page/DB lookup, so a real seeded profile isn't needed here — any userId
    // shape exercises the same redirect (mirrors admin-authorization.spec.ts).
    const response = await page.goto("/admin/candidate-profiles/some-user-id");
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });
});

