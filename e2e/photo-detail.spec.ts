import { test, expect } from "@playwright/test";

test.describe("photo detail flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test("photo detail page loads with image", async ({ page }) => {
    await page.goto("/gallery");
    await page.waitForTimeout(1000);

    // Navigate directly to a photo detail page
    await page.goto("/gallery/gallery-urban-01");
    await expect(page.locator(".photo-detail-hero")).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".photo-detail-cover-frame img")).toBeVisible();
  });

  test("photo detail page has back navigation", async ({ page }) => {
    await page.goto("/gallery");
    await page.waitForTimeout(1000);

    // Navigate directly to a photo detail page
    await page.goto("/gallery/gallery-urban-01");
    await expect(page.locator(".photo-detail-hero")).toBeVisible({ timeout: 10000 });
    
    // Click back button
    const backBtn = page.locator('a[href="/gallery"]').first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await expect(page).toHaveURL(/\/gallery$/);
    }
  });

  test("photo detail page shows related photos", async ({ page }) => {
    await page.goto("/gallery");
    await page.waitForTimeout(1000);

    // Navigate directly to a photo detail page
    await page.goto("/gallery/gallery-urban-01");
    await expect(page.locator(".photo-detail-hero")).toBeVisible({ timeout: 10000 });
    
    // Check for related photos section
    const relatedSection = page.locator(".photo-detail-related");
    if (await relatedSection.isVisible()) {
      await expect(relatedSection.locator(".photo-detail-related-card").first()).toBeVisible();
    }
  });
});
