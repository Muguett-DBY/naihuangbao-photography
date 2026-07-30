import { expect, test, type Page } from "@playwright/test";

async function prepareHome(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("lang", "en");
    localStorage.setItem("nhb-pwa-install-dismissed-until", String(Date.now() + 86_400_000));
  });
  await page.route("**/api/content", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ content: {} }),
  }));
  await page.route("**/api/photos", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ photos: [] }),
  }));
}

test.describe("cinematic homepage premiere", () => {
  test("keeps the first-screen narrative, controls, and real-work reveal usable", async ({ page }) => {
    await prepareHome(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const premiere = page.locator(".cinematic-premiere");
    const hero = page.locator(".hero-home");
    const title = page.locator(".hero-title");
    const booking = page.locator(".hero-cover-primary-btn");
    await expect(premiere).toBeVisible();
    await expect(premiere).toHaveAttribute("data-premiere-phase", "opening");
    await expect(premiere.locator("[data-premiere-frame]")).toHaveCount(5);
    await expect(page.locator(".hero-concept-label")).toContainText("Brand concept visuals");
    await expect(title).toBeVisible();
    await expect(booking).toBeVisible();

    const openingGeometry = await page.evaluate(() => {
      const heroBounds = document.querySelector<HTMLElement>(".hero-home")!.getBoundingClientRect();
      const titleBounds = document.querySelector<HTMLElement>(".hero-title")!.getBoundingClientRect();
      const actionsBounds = document.querySelector<HTMLElement>(".hero-actions")!.getBoundingClientRect();
      return {
        titleInside: titleBounds.left >= heroBounds.left && titleBounds.right <= heroBounds.right,
        actionsInside: actionsBounds.top >= heroBounds.top && actionsBounds.bottom <= heroBounds.bottom,
      };
    });
    expect(openingGeometry).toEqual({ titleInside: true, actionsInside: true });

    await page.evaluate(() => {
      const heroHeight = document.querySelector<HTMLElement>(".hero-home")!.offsetHeight;
      window.scrollTo(0, Math.round(heroHeight * 0.8));
    });
    await expect(premiere).toHaveAttribute("data-premiere-phase", "reveal");
    await expect.poll(async () => page.locator(".hero-contact-sheet").evaluate((element) => (
      Number.parseFloat(getComputedStyle(element).opacity)
    ))).toBeGreaterThan(0.9);

    const chapterConsole = page.locator(".home-index-strip");
    await expect(chapterConsole.locator('a[href="#premiere"]')).toContainText("Premiere");
  });

  test("reduces to a stable cover on motion-sensitive and failed-image paths", async ({ page }) => {
    await prepareHome(page);
    await page.addInitScript(() => sessionStorage.setItem("nhb-disable-webgl", "1"));
    await page.route("**/images/concept-premiere/**", (route) => route.abort("failed"));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const premiere = page.locator(".cinematic-premiere");
    await expect(premiere).toHaveAttribute("data-premiere-motion", "reduced");
    await expect(page.locator(".hero-title")).toBeVisible();
    await expect(page.locator(".hero-cover-primary-btn")).toBeVisible();
    await expect(page.locator(".cinematic-premiere__frame-stack")).toHaveCSS("display", "none");
    expect(await page.locator(".hero-contact-sheet").evaluate((element) => (
      Number.parseFloat(getComputedStyle(element).opacity)
    ))).toBeGreaterThan(0.95);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
});
