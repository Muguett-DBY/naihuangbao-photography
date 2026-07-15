import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

type CanvasSample = {
  changedPixels: number;
  sampledPixels: number;
};

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
  test.use({ viewport: { width: 1440, height: 900 } });

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
});
