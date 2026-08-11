import { expect, test } from "@playwright/test";

test("keeps the site usable when browser storage is blocked", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));

  await page.addInitScript(() => {
    for (const storageName of ["localStorage", "sessionStorage"] as const) {
      Object.defineProperty(window, storageName, {
        configurable: true,
        get() {
          throw new DOMException("Storage access denied", "SecurityError");
        },
      });
    }
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      get() {
        throw new DOMException("IndexedDB access denied", "SecurityError");
      },
    });
  });

  await page.goto("/");

  await expect(page.locator(".hero")).toBeVisible();
  await expect(page.locator(".site-nav")).toBeVisible();

  await page.locator(".nav-utility-trigger").click();
  await page.locator(".theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.locator(".mood-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-mood", "cute");

  await page.locator(".lang-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  expect(pageErrors).toEqual([]);
});

test("falls back to an in-memory project when IndexedDB is unavailable", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      get() {
        throw new DOMException("IndexedDB access denied", "SecurityError");
      },
    });
  });

  await page.goto("/projects");

  await expect(page.locator(".workspace-page")).toBeVisible();
  await expect(page.locator(".workspace-project-list button").first()).toBeVisible();
  await expect(page.locator(".workspace-project")).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("ignores invalid persisted appearance and language values", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("mood", "broken");
    localStorage.setItem("theme", "broken");
    localStorage.setItem("lang", "broken");
  });

  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-mood", "magazine");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("mood"))).toBeNull();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("theme"))).toBeNull();
});
