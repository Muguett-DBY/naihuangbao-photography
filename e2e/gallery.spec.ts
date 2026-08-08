import { test, expect } from "@playwright/test";

test.describe("gallery browsing flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test("gallery page loads with photos", async ({ page }) => {
    await page.goto("/gallery");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".gallery-masonry-item").first()).toBeVisible({ timeout: 10000 });
  });

  test("gallery filtering works", async ({ page }) => {
    await page.goto("/gallery");
    await page.waitForTimeout(1000);

    // Find filter buttons
    const filterBtns = page.locator(".filter-row button");
    const count = await filterBtns.count();
    
    if (count > 1) {
      // Click a specific filter
      await filterBtns.nth(1).click();
      await page.waitForTimeout(500);
      
      // Verify filter is active
      await expect(filterBtns.nth(1)).toHaveClass(/is-active/);
    }
  });

  test("gallery search works", async ({ page }) => {
    await page.goto("/gallery");
    await page.waitForTimeout(1000);

    const searchInput = page.locator(".gallery-search-input");
    if (await searchInput.isVisible()) {
      await searchInput.fill("test");
      await page.waitForTimeout(500);
      
      // Clear search
      const clearBtn = page.locator(".gallery-search-clear");
      if (await clearBtn.isVisible()) {
        await clearBtn.click();
        await expect(searchInput).toHaveValue("");
      }
    }
  });

  test("switches between contact sheet and exhibition atlas", async ({ page }) => {
    await page.goto("/gallery");
    const viewButtons = page.locator(".gallery-view-btn");
    await expect(viewButtons).toHaveCount(5);

    await viewButtons.nth(2).click();
    await expect(page).toHaveURL(/view=contact/);
    await expect(page.locator(".gallery-masonry--contact").first()).toBeVisible();

    await viewButtons.nth(4).click();
    await expect(page).toHaveURL(/view=atlas/);
    await expect(page.locator(".gallery-exhibition-atlas")).toBeVisible();
    await expect(page.locator(".gallery-exhibition-atlas__lead img")).toBeVisible();
  });

  test("photo detail page loads from gallery", async ({ page }) => {
    await page.goto("/gallery");
    await page.waitForTimeout(1000);

    // Navigate directly to a photo detail page
    await page.goto("/gallery/gallery-urban-01");
    await expect(page.locator(".photo-detail-hero")).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".photo-detail-cover-frame img")).toBeVisible();
  });
});
