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

test.describe("booking-first homepage", () => {
  test("shows a real-work booking cover while the homepage chunk is loading", async ({ page }) => {
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
    await expect(fallback.locator('a[href="/booking"]')).toBeVisible();
    await expect(fallback.locator('a[href="/gallery"]')).toBeVisible();
    await expect(fallback.locator('img[fetchpriority="high"]')).toBeAttached();
    await expect(page.locator(".adm-loading-dots")).not.toBeVisible();
    expect(await fallback.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(580);

    await expect(fallback).toHaveCount(0, { timeout: 5_000 });
    await expect(page.locator(".home-booking-hero")).toBeVisible();
  });

  test("keeps one clear booking hierarchy and a user-controlled real-photo selector", async ({ page }) => {
    await prepareHome(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const hero = page.locator(".home-booking-hero");
    const title = hero.getByRole("heading", { level: 1 });
    const actions = hero.locator(".home-booking-actions");
    const selector = hero.getByRole("group", { name: "Gallery" });
    const selectorButtons = selector.getByRole("button");
    const selectorMeta = selector.locator(".home-booking-hero__selector-meta");
    const heroImage = hero.locator(".home-booking-hero__media img");

    await expect(hero).toBeVisible();
    await expect(title).toHaveCount(1);
    await expect(actions.getByRole("button")).toHaveCount(1);
    await expect(actions.getByRole("link")).toHaveCount(1);
    await expect(actions.getByRole("link")).toHaveAttribute("href", "/gallery");
    await expect(selectorButtons).toHaveCount(3);
    await expect(selectorMeta).toHaveAttribute("aria-live", "polite");
    await expect(selectorButtons.first()).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('#premiere img[fetchpriority="high"]')).toHaveCount(1);
    await expect(page.locator(".cinematic-premiere, .visual-light-table, .home-visual-system, .immersive-experience-canvas")).toHaveCount(0);

    const initialSource = await heroImage.evaluate((image) => (image as HTMLImageElement).currentSrc);
    const nextTitle = await selectorButtons.nth(1).getAttribute("aria-label");
    await selectorButtons.nth(1).click();
    await expect(selectorButtons.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(selectorMeta).toContainText(nextTitle ?? "");
    await expect.poll(() => heroImage.evaluate((image) => (image as HTMLImageElement).currentSrc)).not.toBe(initialSource);

    await actions.getByRole("button").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await expect(page.locator(".home-index-strip a")).toHaveCount(5);
    await page.dispatchEvent("body", "pointerdown");
    await page.waitForTimeout(800);
    expect(await immersiveResources(page)).toEqual([]);
  });

  test("keeps the narrow booking cover readable, interactive, and overflow-free", async ({ page }) => {
    await prepareHome(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    const hero = page.locator(".home-booking-hero");
    const selectorButtons = hero.locator(".home-booking-hero__selector button");
    const heroImage = hero.locator(".home-booking-hero__media img");
    const initialSource = await heroImage.evaluate((image) => (image as HTMLImageElement).currentSrc);

    await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(hero.locator(".home-booking-primary")).toBeVisible();
    await expect(hero.locator('.home-booking-secondary[href="/gallery"]')).toBeVisible();
    await expect(selectorButtons).toHaveCount(3);

    await selectorButtons.nth(2).click();
    await expect(selectorButtons.nth(2)).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => heroImage.evaluate((image) => (image as HTMLImageElement).currentSrc)).not.toBe(initialSource);
    await expect(page.locator(".immersive-experience-canvas")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });

  test("keeps a stable booking cover for motion-sensitive and failed-image paths", async ({ page }) => {
    await prepareHome(page);
    await page.route("**/images/gallery/**", (route) => route.abort("failed"));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const hero = page.locator(".home-booking-hero");
    await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(hero.locator(".home-booking-primary")).toBeVisible();
    await expect(hero.locator('.home-booking-secondary[href="/gallery"]')).toBeVisible();
    await expect(hero.locator(".home-booking-hero__media")).toBeVisible();
    await expect(page.locator(".immersive-experience-canvas")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
});
