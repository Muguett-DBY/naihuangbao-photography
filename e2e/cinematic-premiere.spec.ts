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
  test("shows the image-led premiere cover while the homepage chunk is still loading", async ({ page }) => {
    await prepareHome(page);
    let delayedHomeChunk = false;
    await page.route(/\/assets\/HomePage-[^/]+\.js(?:\?.*)?$/, async (route) => {
      delayedHomeChunk = true;
      await new Promise((resolve) => setTimeout(resolve, 1_800));
      await route.continue();
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const fallback = page.locator(".home-premiere-fallback");
    await expect.poll(() => delayedHomeChunk).toBe(true);
    await expect(fallback).toBeVisible();
    await expect(fallback.locator("h1")).toBeVisible();
    await expect(fallback.locator(".hero-cover-primary-btn")).toBeVisible();
    await expect(fallback.locator('img[fetchpriority="high"]')).toBeAttached();
    await expect(page.locator(".adm-loading-dots")).not.toBeVisible();
    expect(await fallback.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(580);

    await expect(fallback).toHaveCount(0, { timeout: 5_000 });
    await expect(page.locator('.cinematic-premiere[data-premiere-phase="opening"]')).toBeVisible();
  });

  test("keeps the director reel, visual modes, and real-work reveal responsive", async ({ page }) => {
    await prepareHome(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const premiere = page.locator(".cinematic-premiere");
    const hero = page.locator(".hero-home");
    const title = page.locator(".hero-title");
    const archiveAction = page.locator(".hero-cover-primary-btn");
    const reelButtons = premiere.locator(".cinematic-premiere__reel button");
    const modeButtons = premiere.locator(".cinematic-premiere__mode button");

    await expect(premiere).toBeVisible();
    await expect(premiere).toHaveAttribute("data-premiere-phase", "opening");
    await expect(premiere.locator("[data-premiere-scene]")).toHaveCount(5);
    await expect(reelButtons).toHaveCount(5);
    await expect(modeButtons).toHaveCount(2);
    await expect(premiere.locator(".cinematic-premiere__scene img")).toHaveCount(1);
    await expect(premiere).toHaveAttribute("data-loaded-scenes", "1");
    await expect(page.locator(".hero-concept-label")).toContainText("Brand concept visuals");
    await expect(title).toBeVisible();
    await expect(archiveAction).toBeVisible();
    await expect.poll(async () => premiere.locator(".cinematic-premiere__scene img").first().evaluate((image) => (
      image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0
    ))).toBe(true);
    await expect(page.locator('#premiere img[fetchpriority="high"]')).toHaveCount(1);

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

    await reelButtons.nth(1).hover();
    await expect(premiere).toHaveAttribute("data-active-scene", "paper");
    await expect(premiere).toHaveAttribute("data-loaded-scenes", "2");
    await expect(premiere.locator(".cinematic-premiere__scene img")).toHaveCount(2);
    await expect(premiere.locator(".cinematic-premiere__readout")).toContainText("Rain light on paper");

    await reelButtons.nth(1).focus();
    await page.keyboard.press("ArrowRight");
    await expect(premiere).toHaveAttribute("data-active-scene", "coral");
    await expect(reelButtons.nth(2)).toBeFocused();

    const heroBounds = await hero.boundingBox();
    expect(heroBounds).not.toBeNull();
    if (heroBounds) {
      await page.mouse.move(heroBounds.x + heroBounds.width * 0.82, heroBounds.y + heroBounds.height * 0.3);
    }
    await expect(premiere).toHaveAttribute("data-premiere-pointer", "active");
    await expect(premiere.locator(".cinematic-premiere__optical-lens")).toHaveCSS("opacity", "1");
    await expect.poll(async () => hero.evaluate((element) => (
      Math.abs(Number.parseFloat(getComputedStyle(element).getPropertyValue("--premiere-pointer-x")))
    ))).toBeGreaterThan(4);

    await modeButtons.nth(1).click();
    await expect(hero).toHaveAttribute("data-premiere-view", "portfolio");
    await expect(modeButtons.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(premiere.locator(".cinematic-premiere__reel")).toHaveCount(0);
    await expect(premiere.locator(".cinematic-premiere__readout")).toHaveCount(0);
    await expect.poll(async () => page.locator(".hero-contact-sheet").evaluate((element) => (
      Number.parseFloat(getComputedStyle(element).opacity)
    ))).toBeGreaterThan(0.95);

    await page.evaluate(() => {
      const heroHeight = document.querySelector<HTMLElement>(".hero-home")!.offsetHeight;
      window.scrollTo(0, Math.round(heroHeight * 0.38));
    });
    await expect(premiere).toHaveAttribute("data-premiere-phase", "reveal");

    const chapterConsole = page.locator(".home-index-strip");
    await expect(chapterConsole.locator('a[href="#premiere"]')).toContainText("Optical Garden");
  });

  test("keeps the mobile opening concept-led before revealing real work", async ({ page }) => {
    await prepareHome(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    const conceptStage = page.locator(".cinematic-premiere__stage");
    const realWork = page.locator(".hero-contact-sheet");
    await expect.poll(async () => Number.parseFloat(await conceptStage.evaluate((element) => getComputedStyle(element).opacity))).toBeGreaterThan(0.75);
    await expect.poll(async () => Number.parseFloat(await realWork.evaluate((element) => getComputedStyle(element).opacity))).toBeLessThan(0.08);

    await page.evaluate(() => {
      const hero = document.querySelector<HTMLElement>(".hero-home")!;
      window.scrollTo(0, hero.offsetHeight * 0.42);
    });
    await expect.poll(async () => Number.parseFloat(await realWork.evaluate((element) => getComputedStyle(element).opacity))).toBeGreaterThan(0.3);
  });

  test("reduces to a stable cover on motion-sensitive and failed-image paths", async ({ page }) => {
    await prepareHome(page);
    await page.addInitScript(() => sessionStorage.setItem("nhb-disable-webgl", "1"));
    await page.route("**/images/optical-archive/**", (route) => route.abort("failed"));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const premiere = page.locator(".cinematic-premiere");
    const hero = page.locator(".hero-home");
    await expect(premiere).toHaveAttribute("data-premiere-motion", "reduced");
    await expect(page.locator(".hero-title")).toBeVisible();
    await expect(page.locator(".hero-cover-primary-btn")).toBeVisible();
    await expect(premiere.locator(".cinematic-premiere__stage")).toBeVisible();
    await expect(premiere.locator(".cinematic-premiere__mode")).toHaveCSS("display", "none");
    await expect(premiere.locator(".cinematic-premiere__reel")).toHaveCSS("display", "none");
    await expect.poll(async () => page.locator(".hero-contact-sheet").evaluate((element) => (
      Number.parseFloat(getComputedStyle(element).opacity)
    ))).toBeGreaterThan(0.95);
    await expect(hero).not.toHaveAttribute("data-premiere-view", "portfolio");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
});
