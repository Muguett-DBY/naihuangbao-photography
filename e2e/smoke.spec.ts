import { test, expect } from "@playwright/test";

// Playwright config is at e2e/playwright.config.ts - run with: npx playwright test --config=e2e/playwright.config.ts

test.describe("shoot.custard.top", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test("首页加载正确", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/奶黄包摄影|Naihuangbao Photography/);
    await expect(page.locator(".hero")).toBeVisible();
    await expect(page.locator(".site-nav")).toBeVisible();
  });

  test("导航链接可点击跳转", async ({ page }) => {
    await page.goto("/");
    await page.locator('.nav-menu--inline a[href="/gallery"]').click();
    await expect(page).toHaveURL(/\/gallery$/);
    await expect(page.locator("#gallery")).toBeVisible();
  });

  test("Lightbox 打开和关闭", async ({ page }) => {
    await page.goto("/");
    // Scroll to gallery
    await page.evaluate(() => document.getElementById("gallery")?.scrollIntoView());
    await expect(page.locator(".gallery-masonry-item").first()).toBeVisible();
    // Click first gallery item
    const firstItem = page.locator(".gallery-masonry-item").first();
    await firstItem.click();
    await expect(page.locator(".pswp")).toBeVisible();
    await page.locator(".pswp__button--close").click();
    await expect(page.locator(".pswp")).not.toBeVisible({ timeout: 10000 });
  });

  test("首页作品区和作品入口存在", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#featured")).toBeVisible();
    await expect(page.locator(".gallery-masonry-item").first()).toBeVisible();
    await expect(page.locator('.home-page-link[href="/gallery"]')).toBeVisible();
  });

  test("深色模式切换", async ({ page }) => {
    await page.goto("/");
    await page.locator(".theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.locator(".theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.locator(".theme-toggle").click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  });
});
