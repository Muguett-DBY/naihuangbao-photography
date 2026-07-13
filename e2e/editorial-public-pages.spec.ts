import { expect, test } from "@playwright/test";

test.describe("editorial public pages", () => {
  test("mobile review controls stay clear of the testimonial", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const reviews = page.locator(".reviews-shell");
    await reviews.scrollIntoViewIfNeeded();

    const geometry = await reviews.evaluate((section) => {
      const text = section.querySelector<HTMLElement>(".reviews-text")?.getBoundingClientRect();
      const controls = [...section.querySelectorAll<HTMLElement>(".reviews-nav")].map((control) => {
        const rect = control.getBoundingClientRect();
        return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height };
      });

      return {
        text: text && { top: text.top, right: text.right, bottom: text.bottom, left: text.left },
        controls,
      };
    });

    expect(geometry.text).toBeTruthy();
    expect(geometry.controls).toHaveLength(2);
    for (const control of geometry.controls) {
      expect(control.width).toBeGreaterThanOrEqual(44);
      expect(control.height).toBeGreaterThanOrEqual(44);
      expect(control.top).toBeGreaterThanOrEqual(geometry.text!.bottom);
    }
  });

  test("style finder completes and opens booking from its recommendation", async ({ page }) => {
    await page.goto("/");
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
