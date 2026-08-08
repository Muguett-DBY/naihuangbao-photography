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

  test("rain letter advances one readable editorial note at a time", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");

    const section = page.locator(".rain-letter");
    await expect(section).toBeAttached();
    await page.evaluate(() => {
      const element = document.querySelector<HTMLElement>(".rain-letter")!;
      const progressDistance = element.offsetHeight - window.innerHeight;
      window.scrollTo(0, element.offsetTop + progressDistance * 0.5);
    });

    await expect(section).toHaveAttribute("data-rain-phase", "window");
    await expect(section.locator(".rain-letter__masthead")).toBeVisible();
    await expect.poll(async () => section.locator(".rain-letter__note").evaluateAll((notes) => (
      notes.filter((note) => getComputedStyle(note).visibility === "visible").length
    ))).toBe(1);
    await expect(section.locator(".rain-letter__note--2")).toBeVisible();
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
