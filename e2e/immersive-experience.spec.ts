import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

type CanvasSample = {
  changedPixels: number;
  sampledPixels: number;
};

const catalogueFixtures = {
  course: {
    id: "course-immersive",
    title: "Optical field notes",
    description: "A focused portrait-lighting course.",
    cover_image_url: "/images/gallery/gallery-garden-01.webp",
    category: "beginner",
    difficulty: "beginner",
    duration_minutes: 90,
    price_cents: 39900,
    price_display: "CNY 399",
    currency: "CNY",
    published: 1,
  },
  preset: {
    id: "preset-immersive",
    name: "Chromatic archive",
    description: "A restrained split-channel portrait grade.",
    category: "lightroom",
    preview_images: [
      "/images/gallery/gallery-urban-01.webp",
      "/images/gallery/gallery-daily-01.webp",
    ],
    download_url: "/downloads/chromatic-archive.zip",
    price_display: "CNY 89",
    featured: 1,
    download_count: 42,
  },
  workshop: {
    id: "workshop-immersive",
    title: "Lakeside light study",
    description: "A field session for environmental portraiture.",
    cover_image_url: "/images/gallery/gallery-jiangnan-01.webp",
    event_date: "2099-08-18",
    event_time: "07:00",
    location: "Nanjing",
    max_participants: 8,
    current_participants: 3,
    price_cents: 69900,
    price_display: "CNY 699",
    currency: "CNY",
    status: "upcoming",
  },
  merchandise: {
    id: "item-immersive",
    name: "Hand-bound portrait archive",
    description: "A cloth-bound album for one complete portrait story.",
    images: [
      "/images/gallery/gallery-daily-01.webp",
      "/images/gallery/gallery-garden-01.webp",
    ],
    category: "album",
    price_display: "CNY 299",
    available: 1,
  },
};

async function fulfillJson(route: Parameters<Parameters<Page["route"]>[1]>[0], body: unknown) {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

async function mockCatalogueApi(page: Page) {
  const { course, preset, workshop, merchandise } = catalogueFixtures;
  await page.route("**/api/auth/session", (route) => fulfillJson(route, { authenticated: false, user: null }));
  await page.route("**/api/courses", (route) => fulfillJson(route, { courses: [course] }));
  await page.route("**/api/presets", (route) => fulfillJson(route, { presets: [preset] }));
  await page.route("**/api/workshops", (route) => fulfillJson(route, { workshops: [workshop] }));
  await page.route("**/api/merchandise", (route) => fulfillJson(route, { merchandise: [merchandise] }));
  await page.route(new RegExp(`/api/courses/${course.id}$`), (route) => fulfillJson(route, { course, modules: [] }));
  await page.route(new RegExp(`/api/presets/${preset.id}$`), (route) => fulfillJson(route, { preset }));
  await page.route(new RegExp(`/api/workshops/${workshop.id}$`), (route) => fulfillJson(route, { workshop }));
  await page.route(new RegExp(`/api/merchandise/${merchandise.id}$`), (route) => fulfillJson(route, { merchandise }));
}

async function sampleCanvas(page: Page): Promise<CanvasSample> {
  const canvas = page.locator(".immersive-experience-canvas");
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toBeVisible();
  await page.evaluate(() => {
    const target = document.querySelector(".immersive-experience-canvas");
    if (!target) return;
    let style = document.querySelector<HTMLStyleElement>("style[data-immersive-e2e-mask]");
    if (!style) {
      style = document.createElement("style");
      style.dataset.immersiveE2eMask = "true";
      style.textContent = ".e2e-hide-from-immersive { visibility: hidden !important; }";
      document.head.append(style);
    }
    document.querySelectorAll("body *").forEach((element) => {
      if (element === target || element.contains(target) || target.contains(element)) return;
      element.classList.add("e2e-hide-from-immersive");
    });
  });

  try {
    const rendered = await page.screenshot();
    await canvas.evaluate((element) => element.classList.add("e2e-hide-from-immersive"));
    const baseline = await page.screenshot();
    const renderedPixels = await sharp(rendered).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const baselinePixels = await sharp(baseline).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (
      renderedPixels.info.width !== baselinePixels.info.width
      || renderedPixels.info.height !== baselinePixels.info.height
      || renderedPixels.info.channels !== baselinePixels.info.channels
    ) {
      return { changedPixels: 0, sampledPixels: 0 };
    }

    const channels = renderedPixels.info.channels;
    let changedPixels = 0;
    for (let index = 0; index < renderedPixels.data.length; index += channels) {
      const difference = Math.abs(renderedPixels.data[index]! - baselinePixels.data[index]!)
        + Math.abs(renderedPixels.data[index + 1]! - baselinePixels.data[index + 1]!)
        + Math.abs(renderedPixels.data[index + 2]! - baselinePixels.data[index + 2]!);
      if (difference > 24) changedPixels += 1;
    }
    return { changedPixels, sampledPixels: renderedPixels.info.width * renderedPixels.info.height };
  } finally {
    await page.evaluate(() => {
      document.querySelectorAll(".e2e-hide-from-immersive").forEach((element) => {
        element.classList.remove("e2e-hide-from-immersive");
      });
      document.querySelector("style[data-immersive-e2e-mask]")?.remove();
    });
  }
}

test.describe("immersive portrait archive", () => {
  test.use({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });

  test("reuses one nonblank canvas across flagship routes", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    const canvas = page.locator(".immersive-experience-canvas");
    await expect(page.locator("[data-immersive-anchor='home']")).toBeVisible();
    await expect(canvas).toHaveAttribute("data-scene-preset", "home");
    await expect.poll(async () => (await sampleCanvas(page)).changedPixels).toBeGreaterThan(500);
    const originalCanvas = await canvas.elementHandle();
    expect(originalCanvas).not.toBeNull();

    await page.locator(".hero-gallery-link").click();
    await expect(page).toHaveURL(/\/gallery$/);
    await expect(page.locator("[data-immersive-anchor='gallery']")).toBeVisible();
    await expect(canvas).toHaveAttribute("data-scene-preset", "gallery");
    expect(await canvas.evaluate((node, original) => node === original, originalCanvas)).toBe(true);

    const detailLink = page.locator("[data-gallery-photo-id='gallery-urban-01'] .gallery-detail-link");
    await detailLink.scrollIntoViewIfNeeded();
    await detailLink.focus();
    await expect(canvas).toHaveAttribute("data-highlighted-id", "gallery-urban-01");
    const pointerCard = page.locator("[data-gallery-photo-id='gallery-garden-01']");
    await pointerCard.hover();
    await expect(canvas).toHaveAttribute("data-highlighted-id", "gallery-garden-01");
    await page.locator(".gallery-page-hero-copy").hover();
    await expect(canvas).toHaveAttribute("data-highlighted-id", "gallery-urban-01");
    await detailLink.evaluate((element) => (element as HTMLElement).blur());
    await expect(canvas).not.toHaveAttribute("data-highlighted-id");
    await detailLink.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/gallery\/gallery-urban-01$/);
    await expect(page.locator("[data-immersive-anchor='photo-detail']")).toBeVisible();
    await expect(canvas).toHaveAttribute("data-scene-preset", "photo-detail");
    expect(await canvas.evaluate((node, original) => node === original, originalCanvas)).toBe(true);
    await expect(page.locator(".photo-detail-heading h1")).toBeVisible();
    await expect(page.locator(".photo-detail-cover-frame img")).toBeVisible();
    await expect.poll(async () => (await sampleCanvas(page)).changedPixels).toBeGreaterThan(500);
  });

  test("renders a framed nonblank scene without mobile overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    const canvas = page.locator(".immersive-experience-canvas");
    const siteNav = page.locator(".site-nav");
    await expect(page.locator("[data-immersive-anchor='home']")).toBeVisible();
    await expect(canvas).toHaveAttribute("data-scene-preset", "home");
    await expect(siteNav).toHaveCSS("position", "fixed");
    expect((await siteNav.boundingBox())?.y).toBeLessThanOrEqual(1);
    await expect(page.locator(".hero h1")).toBeVisible();
    await expect(page.locator(".hero-gallery-link")).toBeVisible();
    await expect.poll(async () => (await sampleCanvas(page)).changedPixels).toBeGreaterThan(250);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });

  test("covers every catalogue index and detail route with focus-aware optical scenes", async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await mockCatalogueApi(page);
    const routes = [
      { index: "/courses", indexPreset: "courses", detail: `/courses/${catalogueFixtures.course.id}`, detailPreset: "course-detail", id: catalogueFixtures.course.id },
      { index: "/products", indexPreset: "presets", detail: `/presets/${catalogueFixtures.preset.id}`, detailPreset: "preset-detail", id: catalogueFixtures.preset.id },
      { index: "/workshops", indexPreset: "workshops", detail: `/workshops/${catalogueFixtures.workshop.id}`, detailPreset: "workshop-detail", id: catalogueFixtures.workshop.id },
      { index: "/shop", indexPreset: "shop", detail: `/shop/${catalogueFixtures.merchandise.id}`, detailPreset: "shop-detail", id: catalogueFixtures.merchandise.id },
    ];
    const canvas = page.locator(".immersive-experience-canvas");

    for (const route of routes) {
      await page.goto(route.index);
      await expect(canvas).toHaveCount(1);
      await expect(canvas).toHaveAttribute("data-scene-preset", route.indexPreset);
      await expect.poll(async () => (await sampleCanvas(page)).changedPixels).toBeGreaterThan(500);

      const card = page.locator(`[data-immersive-item-id='${route.id}']`);
      const cardLink = card.locator("a").first();
      await cardLink.focus();
      await expect(canvas).toHaveAttribute("data-highlighted-id", route.id);
      await cardLink.evaluate((element) => (element as HTMLElement).blur());
      await expect(canvas).not.toHaveAttribute("data-highlighted-id");
      await card.hover();
      await expect(canvas).toHaveAttribute("data-highlighted-id", route.id);
      await page.locator(".page-hero-heading").hover();
      await expect(canvas).not.toHaveAttribute("data-highlighted-id");

      await page.goto(route.detail);
      await expect(page.locator(".catalogue-detail-stage")).toBeVisible();
      await expect(canvas).toHaveCount(1);
      await expect(canvas).toHaveAttribute("data-scene-preset", route.detailPreset);
      await expect.poll(async () => (await sampleCanvas(page)).changedPixels).toBeGreaterThan(500);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }
  });
});
