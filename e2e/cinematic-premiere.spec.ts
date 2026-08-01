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

  test("keeps the first-screen narrative, controls, and real-work reveal usable", async ({ page }) => {
    await prepareHome(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const premiere = page.locator(".cinematic-premiere");
    const hero = page.locator(".hero-home");
    const signature = page.locator("[data-premiere-signature]");
    const title = page.locator(".hero-title");
    const booking = page.locator(".hero-cover-primary-btn");
    await expect(premiere).toBeVisible();
    await expect(premiere).toHaveAttribute("data-premiere-phase", "opening");
    await expect(premiere).toHaveAttribute("data-premiere-intro", /running|settled/);
    await expect(premiere.locator("[data-premiere-frame]")).toHaveCount(7);
    await expect(premiere.locator("[data-premiere-aperture]")).toBeVisible();
    await expect(premiere.locator("[data-premiere-cold-open]")).toBeVisible();
    await expect(premiere.locator("[data-premiere-repeat-frame]")).toHaveCount(5);
    await expect(premiere.locator(".cinematic-premiere__portal-frame")).toHaveCount(2);
    await expect(signature).toHaveCount(1);
    await expect(signature.locator("img")).toHaveCount(5);
    await expect(page.locator("[data-premiere-trail-frame]")).toHaveCount(4);
    const repeatSources = await premiere.locator("[data-premiere-repeat-frame] img").evaluateAll((images) => (
      images.map((image) => image.getAttribute("src"))
    ));
    const signatureSources = await signature.locator("img").evaluateAll((images) => (
      images.map((image) => image.getAttribute("src"))
    ));
    expect(new Set(repeatSources).size).toBe(5);
    expect(new Set(signatureSources).size).toBe(5);
    await expect(page.locator(".hero-concept-label")).toContainText("Brand concept visuals");
    await expect(title).toBeVisible();
    await expect(booking).toBeVisible();
    await expect.poll(async () => premiere.locator("[data-premiere-repeat-frame]").evaluateAll((elements) => (
      Math.max(...elements.map((element) => Number.parseFloat(getComputedStyle(element).opacity)))
    ))).toBeGreaterThan(0.8);
    await expect.poll(async () => premiere.locator("[data-premiere-repeat-frame] img").first().evaluate((image) => (
      image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0
    ))).toBe(true);
    await expect(premiere).toHaveAttribute("data-premiere-intro", "settled");
    await expect(hero).toHaveAttribute("data-premiere-intro", "settled");
    await expect(signature).toHaveAttribute("data-premiere-intro", "settled");
    await expect(signature).toHaveCSS("visibility", "hidden");

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

    const heroBounds = await hero.boundingBox();
    expect(heroBounds).not.toBeNull();
    if (heroBounds) {
      await page.mouse.move(
        heroBounds.x + heroBounds.width * 0.84,
        heroBounds.y + heroBounds.height * 0.28,
      );
    }
    await expect(premiere).toHaveAttribute("data-premiere-pointer", "active");
    await expect(premiere).toHaveAttribute("data-premiere-trail", "active");
    await expect.poll(async () => hero.evaluate((element) => (
      Number.parseFloat(getComputedStyle(element).getPropertyValue("--premiere-pointer-x"))
    ))).toBeGreaterThan(56);
    if (heroBounds) {
      await page.mouse.move(
        heroBounds.x + heroBounds.width * 0.68,
        heroBounds.y + heroBounds.height * 0.64,
        { steps: 3 },
      );
    }
    await expect.poll(async () => page.locator("[data-premiere-trail-frame]").evaluateAll((elements) => (
      Math.max(...elements.map((element) => Number.parseFloat(getComputedStyle(element).opacity)))
    ))).toBeGreaterThan(0.1);

    await page.evaluate(() => {
      const heroHeight = document.querySelector<HTMLElement>(".hero-home")!.offsetHeight;
      window.scrollTo(0, Math.round(heroHeight * 0.38));
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
    const hero = page.locator(".hero-home");
    const signature = page.locator("[data-premiere-signature]");
    await expect(premiere).toHaveAttribute("data-premiere-motion", "reduced");
    await expect(premiere).toHaveAttribute("data-premiere-intro", "reduced");
    await expect(hero).toHaveAttribute("data-premiere-intro", "reduced");
    await expect(page.locator(".hero-title")).toBeVisible();
    await expect(page.locator(".hero-cover-primary-btn")).toBeVisible();
    await expect(page.locator(".cinematic-premiere__frame-stack")).toHaveCSS("display", "none");
    await expect(page.locator("[data-premiere-aperture]")).not.toBeVisible();
    await expect(page.locator("[data-premiere-trail-layer]")).toHaveCSS("display", "none");
    await expect(signature).toHaveCSS("display", "none");
    await expect(premiere).toHaveAttribute("data-premiere-trail", "disabled");
    expect(await page.locator(".hero-contact-sheet").evaluate((element) => (
      Number.parseFloat(getComputedStyle(element).opacity)
    ))).toBeGreaterThan(0.95);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
});
