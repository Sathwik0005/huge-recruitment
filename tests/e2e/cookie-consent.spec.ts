import { test, expect } from "@playwright/test";

/**
 * Analytics consent banner — see src/components/ConsentProvider.tsx,
 * CookieConsentBanner.tsx, GoogleAnalytics.tsx.
 *
 * NEXT_PUBLIC_GA_MEASUREMENT_ID isn't configured in this environment (the
 * user will add it later), so these specs verify the consent architecture
 * itself (banner visibility, cookie persistence, no premature GA request)
 * rather than a real gtag.js load, which requires a real measurement ID.
 */
test.describe("Cookie consent banner", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("Scenario A: rejecting analytics hides the banner, persists the choice, and never requests gtag.js", async ({
    page,
  }) => {
    const gtagRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("googletagmanager.com")) gtagRequests.push(request.url());
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const banner = page.getByRole("region", { name: /cookie consent/i });
    await expect(banner).toBeVisible();

    await banner.getByRole("button", { name: /reject analytics/i }).click();
    await expect(banner).not.toBeVisible();

    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "ga_consent")?.value).toBe("denied");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("region", { name: /cookie consent/i })).not.toBeVisible();
    expect(gtagRequests).toHaveLength(0);
  });

  test("Scenario B: accepting analytics hides the banner and persists the choice across navigation", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const banner = page.getByRole("region", { name: /cookie consent/i });
    await expect(banner).toBeVisible();

    await banner.getByRole("button", { name: /accept analytics/i }).click();
    await expect(banner).not.toBeVisible();

    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "ga_consent")?.value).toBe("granted");

    await page.goto("/jobs", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("region", { name: /cookie consent/i })).not.toBeVisible();

    const cookiesAfterNav = await page.context().cookies();
    expect(cookiesAfterNav.find((c) => c.name === "ga_consent")?.value).toBe("granted");
  });

  test("the footer's Cookie Settings control reopens the banner", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("region", { name: /cookie consent/i })
      .getByRole("button", { name: /accept analytics/i })
      .click();
    await expect(page.getByRole("region", { name: /cookie consent/i })).not.toBeVisible();

    await page.getByRole("button", { name: /cookie settings/i }).click();
    await expect(page.getByRole("region", { name: /cookie consent/i })).toBeVisible();
  });
});
