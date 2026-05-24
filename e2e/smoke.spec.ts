import { test, expect } from "@playwright/test";

// Playwright config is at e2e/playwright.config.ts — run with: npx playwright test --config=e2e/playwright.config.ts

test.describe("shoot.custard.top", () => {
  test("首页加载正确", async ({ page }) => {
    await page.goto("https://shoot.custard.top/");
    await expect(page).toHaveTitle(/奶黄包摄影/);
    await expect(page.locator(".hero")).toBeVisible();
    await expect(page.locator(".site-nav")).toBeVisible();
  });

  test("导航链接可点击跳转", async ({ page }) => {
    await page.goto("https://shoot.custard.top/");
    await page.locator('a[href="#gallery"]').first().click();
    await expect(page.locator("#gallery")).toBeVisible();
  });

  test("Lightbox 打开和关闭", async ({ page }) => {
    await page.goto("https://shoot.custard.top/");
    // Scroll to gallery
    await page.evaluate(() => document.getElementById("gallery")?.scrollIntoView());
    await page.waitForTimeout(1000);
    // Click first gallery item
    const firstItem = page.locator(".gallery-masonry-item").first();
    await firstItem.click();
    await expect(page.locator(".lightbox-overlay")).toBeVisible();
    await page.locator(".lightbox-close").click();
    await expect(page.locator(".lightbox-overlay")).not.toBeVisible();
  });

  test("章节导航点存在", async ({ page }) => {
    await page.goto("https://shoot.custard.top/");
    await expect(page.locator(".section-nav")).toBeVisible();
    await expect(page.locator(".section-nav-dot")).toHaveCount(8);
  });

  test("深色模式切换", async ({ page }) => {
    await page.goto("https://shoot.custard.top/");
    await page.locator(".theme-toggle").click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.locator(".theme-toggle").click();
    await expect(page.locator("html")).toHaveClass(/light/);
  });
});
