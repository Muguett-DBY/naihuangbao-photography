import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

test.describe("flagship v2 experience", () => {
  test.use({ serviceWorkers: "block" });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("lang", "en");
      localStorage.setItem("nhb-pwa-install-dismissed-until", String(Date.now() + 86_400_000));
    });
  });

  test("the streamlined home keeps five chapters in a clear document order", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");

    await expect(page.locator(".home-index-strip a")).toHaveCount(5);
    const offsets = await page.locator("#premiere, #light-table, #visual-system, #portals, #make-something").evaluateAll(
      (sections) => sections.map((section) => (section as HTMLElement).offsetTop),
    );
    expect(offsets).toEqual([...offsets].sort((first, second) => first - second));
    await expect(page.locator(".rain-letter, .home-creative-pulse, .field-notes")).toHaveCount(0);
  });

  test("mobile chapter rail keeps all five chapters on one compact scrollable row", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/#visual-system");

    const rail = page.locator(".home-index-strip");
    await expect(rail.locator('a[href="#visual-system"]')).toHaveClass(/is-active/);
    await expect.poll(async () => rail.evaluate((element) => {
      const links = [...element.querySelectorAll("a")];
      const firstTop = links[0]?.offsetTop ?? 0;
      return {
        count: links.length,
        oneRow: links.every((link) => Math.abs(link.offsetTop - firstTop) <= 1),
      };
    })).toMatchObject({ count: 5, oneRow: true });
    const railHeight = await rail.evaluate((element) => element.scrollHeight);
    expect(railHeight).toBeGreaterThanOrEqual(54);
    expect(railHeight).toBeLessThanOrEqual(56);
  });

  test("gallery story mode opens an editorial photo walk", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/gallery");

    await page.getByRole("button", { name: "Story walk" }).click();
    const storyGrid = page.locator('.gallery-masonry[data-gallery-view="story"]').first();
    await expect(storyGrid).toBeVisible();
    await expect(storyGrid.locator(".gallery-story-note").first()).toBeVisible();
    await expect(storyGrid.locator(".gallery-story-note a").first()).toHaveAttribute("href", /\/gallery\//);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });

  test("editor hold-original control restores the edited canvas on release", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/editor");
    await page.locator('.editor-toolbar input[type="file"]').setInputFiles(
      resolve("public/images/gallery/gallery-urban-01.webp"),
    );

    await expect(page.locator(".editor-canvas")).toBeVisible({ timeout: 15_000 });
    const holdButton = page.getByRole("button", { name: "Hold for original" });
    await holdButton.focus();
    await page.keyboard.down("Space");
    await expect(holdButton).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".editor-held-original")).toHaveCount(1);
    await expect(page.locator(".editor-canvas")).toHaveCSS("opacity", "0");

    await page.keyboard.up("Space");
    await expect(holdButton).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".editor-held-original")).toHaveCount(0);
    await expect(page.locator(".editor-canvas")).toHaveCSS("opacity", "1");
  });
});
