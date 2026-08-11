import { expect, test } from "@playwright/test";

test.describe("editorial public pages", () => {
  test("mobile real-work selector remains usable without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const hero = page.locator(".home-booking-hero");
    await expect(hero).toBeVisible();
    await expect(page.locator(".nhb-cursor-dot")).toBeHidden();
    await expect(page.locator(".nhb-cursor-ring")).toBeHidden();
    const selector = hero.locator(".home-booking-hero__selector");
    const geometry = await selector.evaluate((section) => {
      const controls = [...section.querySelectorAll<HTMLElement>("button")].map((control) => {
        const rect = control.getBoundingClientRect();
        return { right: rect.right, left: rect.left, width: rect.width, height: rect.height };
      });
      return {
        controls,
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    expect(geometry.controls).toHaveLength(3);
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

  test("Japanese and Korean keep the booking brand identity localized", async ({ page }) => {
    const locales = [
      { language: "ja", brand: "奶黄んぼ写真撮影" },
      { language: "ko", brand: "나이황바오 사진촬영" },
    ];

    await page.goto("/about");
    for (const { language, brand } of locales) {
      await page.evaluate((nextLanguage) => window.localStorage.setItem("lang", nextLanguage), language);
      await page.reload();

      await expect(page.locator("html")).toHaveAttribute("lang", language);
      await expect(page.locator(".brand-copy strong")).toHaveText(brand);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(brand);
    }
  });
});
