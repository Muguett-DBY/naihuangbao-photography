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

async function immersiveResources(page: Page) {
  return page.evaluate(() => performance.getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((name) => /(?:ImmersiveExperience|immersive-vendor)-/.test(name)));
}

test.describe("calm cinematic homepage", () => {
  test("shows the image-led cover while the homepage chunk is still loading", async ({ page }) => {
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

  test("keeps one clear hero hierarchy and one compact scene navigator", async ({ page }) => {
    await prepareHome(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const premiere = page.locator(".cinematic-premiere");
    const hero = page.locator(".hero-home");
    const dots = premiere.locator(".cinematic-premiere__scene-dots button");
    const title = hero.locator(".hero-title");
    const actions = hero.locator(".hero-actions");
    const navigator = premiere.locator(".cinematic-premiere__navigator");

    await expect(premiere).toBeVisible();
    await expect(premiere).toHaveAttribute("data-premiere-phase", "opening");
    await expect(premiere.locator("[data-premiere-scene]")).toHaveCount(6);
    await expect(dots).toHaveCount(6);
    await expect(navigator).toBeVisible();
    await expect(premiere.locator(".cinematic-premiere__scene img")).toHaveCount(1);
    await expect(premiere).toHaveAttribute("data-loaded-scenes", "1");
    await expect(page.locator(".hero-concept-label")).toContainText("CONCEPT ARCHIVE");
    await expect(title).toBeVisible();
    await expect(actions.getByRole("link")).toHaveCount(2);
    await expect(page.locator('#premiere img[fetchpriority="high"]')).toHaveCount(1);
    await expect(premiere.locator(".cinematic-premiere__mode, .cinematic-premiere__worlds, .cinematic-premiere__reel, .cinematic-premiere__optical-lens")).toHaveCount(0);
    await expect(page.locator(".project-dock, .nhb-cursor-dot, .film-grain-layer")).toHaveCount(0);

    const openingGeometry = await page.evaluate(() => {
      const heroBounds = document.querySelector<HTMLElement>(".hero-home")!.getBoundingClientRect();
      const titleBounds = document.querySelector<HTMLElement>(".hero-title")!.getBoundingClientRect();
      const actionsBounds = document.querySelector<HTMLElement>(".hero-actions")!.getBoundingClientRect();
      const navigatorBounds = document.querySelector<HTMLElement>(".cinematic-premiere__navigator")!.getBoundingClientRect();
      const overlaps = actionsBounds.left < navigatorBounds.right
        && actionsBounds.right > navigatorBounds.left
        && actionsBounds.top < navigatorBounds.bottom
        && actionsBounds.bottom > navigatorBounds.top;
      return {
        titleInside: titleBounds.left >= heroBounds.left && titleBounds.right <= heroBounds.right,
        actionsInside: actionsBounds.top >= heroBounds.top && actionsBounds.bottom <= heroBounds.bottom,
        controlsSeparated: !overlaps,
      };
    });
    expect(openingGeometry).toEqual({ titleInside: true, actionsInside: true, controlsSeparated: true });

    await dots.nth(1).click();
    await expect(premiere).toHaveAttribute("data-active-scene", "paper");
    await expect.poll(async () => Number(await premiere.getAttribute("data-loaded-scenes"))).toBeGreaterThanOrEqual(2);
    await expect(premiere.locator(".cinematic-premiere__scene-meta")).not.toBeEmpty();

    await dots.nth(1).focus();
    await page.keyboard.press("ArrowRight");
    await expect(premiere).toHaveAttribute("data-active-scene", "corridor");
    await expect(dots.nth(2)).toBeFocused();

    await page.evaluate(() => {
      const heroHeight = document.querySelector<HTMLElement>(".hero-home")!.offsetHeight;
      window.scrollTo(0, Math.round(heroHeight * 0.42));
    });
    await expect(premiere).toHaveAttribute("data-premiere-phase", /unfolding|reveal/);
    await expect(page.locator(".home-index-strip a")).toHaveCount(5);
    await expect(page.locator(".home-index-strip")).toHaveCSS("position", "relative");

    await page.dispatchEvent("body", "pointerdown");
    await page.waitForTimeout(1_800);
    await expect(page.locator(".immersive-experience-canvas")).toHaveCount(0);
    expect(await immersiveResources(page)).toEqual([]);
  });

  test("keeps the narrow opening readable, interactive, and overflow-free", async ({ page }) => {
    await prepareHome(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    const premiere = page.locator(".cinematic-premiere");
    const initialAsset = await premiere.getAttribute("data-active-asset");
    await expect(page.locator(".hero-title")).toBeVisible();
    await expect(page.locator(".hero-actions a")).toHaveCount(2);
    await expect(page.locator(".cinematic-premiere__navigator")).toBeVisible();
    await expect(page.locator(".cinematic-premiere__scene-dots button")).toHaveCount(6);

    await page.evaluate(() => {
      const hero = document.querySelector<HTMLElement>(".hero-home")!;
      window.scrollTo(0, hero.offsetHeight * 0.48);
    });
    await expect(premiere).not.toHaveAttribute("data-active-asset", initialAsset ?? "");
    await expect(page.locator(".project-dock, .immersive-experience-canvas")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });

  test("reduces to a stable cover on motion-sensitive and failed-image paths", async ({ page }) => {
    await prepareHome(page);
    await page.route("**/images/visual-os-v8/**", (route) => route.abort("failed"));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const premiere = page.locator(".cinematic-premiere");
    await expect(premiere).toHaveAttribute("data-premiere-motion", "reduced");
    await expect(page.locator(".hero-title")).toBeVisible();
    await expect(page.locator(".hero-actions a")).toHaveCount(2);
    await expect(premiere.locator(".cinematic-premiere__stage")).toBeVisible();
    await expect(premiere.locator(".cinematic-premiere__navigator")).toBeVisible();
    await expect(page.locator(".immersive-experience-canvas")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
});
