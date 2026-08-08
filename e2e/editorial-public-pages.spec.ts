import { expect, test } from "@playwright/test";

test.describe("editorial public pages", () => {
  test("mobile visual-system controls remain usable without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const visualSystem = page.locator("#visual-system");
    await visualSystem.scrollIntoViewIfNeeded();
    await expect(visualSystem).toBeVisible();
    const geometry = await visualSystem.evaluate((section) => {
      const controls = [...section.querySelectorAll<HTMLElement>(".home-visual-system__nodes button")].map((control) => {
        const rect = control.getBoundingClientRect();
        return { right: rect.right, left: rect.left, width: rect.width, height: rect.height };
      });
      return {
        controls,
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    expect(geometry.controls).toHaveLength(4);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    for (const control of geometry.controls) {
      expect(control.width).toBeGreaterThanOrEqual(44);
      expect(control.height).toBeGreaterThanOrEqual(44);
      expect(control.left).toBeGreaterThanOrEqual(0);
      expect(control.right).toBeLessThanOrEqual(geometry.viewportWidth);
    }
  });

  test("style finder completes and opens booking from its recommendation", async ({ page }) => {
    await page.goto("/booking");
    await page.locator("#style-finder").scrollIntoViewIfNeeded();

    for (let step = 0; step < 4; step += 1) {
      await expect(page.locator(".quiz-option").first()).toBeVisible();
      await page.locator(".quiz-option").first().click();
      await page.waitForTimeout(400);
    }

    await expect(page.locator(".quiz-result")).toBeVisible();
    await expect(page.locator(".quiz-result-package h3")).not.toBeEmpty();

    await page.locator(".quiz-book-button").click();
    await expect(page.locator("#booking-package")).toBeVisible();
  });
});
