import { expect, test, type Page } from "@playwright/test";

const compareEntries = [
  {
    id: "gallery-urban-01",
    title: "City portrait",
    href: "/gallery/gallery-urban-01",
    imageUrl: "/images/gallery/gallery-urban-01.webp",
    addedAt: 1,
  },
  {
    id: "gallery-garden-01",
    title: "Garden portrait",
    href: "/gallery/gallery-garden-01",
    imageUrl: "/images/gallery/gallery-garden-01.webp",
    addedAt: 2,
  },
];

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
}

test.describe("editorial booking, account, map, and comparison workspaces", () => {
  test.use({ serviceWorkers: "block" });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
  });

  test("account mode and password visibility controls expose their state to the keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login?lang=en");

    const mode = page.getByRole("group", { name: "Account access mode" });
    const login = mode.getByRole("button", { name: "Log in", exact: true });
    const register = mode.getByRole("button", { name: "Register", exact: true });
    await expect(login).toHaveAttribute("aria-pressed", "true");
    await expect(register).toHaveAttribute("aria-pressed", "false");

    await register.press("Enter");
    await expect(register).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#displayName")).toBeVisible();

    const password = page.locator("#password");
    const visibility = page.locator(".login-password-toggle");
    await expect(visibility).toHaveAccessibleName("Show password");
    await password.fill("portrait-pass");
    await visibility.focus();
    await visibility.press("Space");
    await expect(password).toHaveAttribute("type", "text");
    await expect(visibility).toHaveAttribute("aria-pressed", "true");
    await expect(visibility).toHaveAccessibleName("Hide password");

    await visibility.press("Space");
    await expect(password).toHaveAttribute("type", "password");
    await expect(page.locator(".auth-page-media img")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("map view switch and location combobox preserve explicit selection state", async ({ page }) => {
    await page.goto("/map?lang=en");

    const toolbar = page.getByRole("group", { name: "Choose map or location list view" });
    const mapButton = toolbar.getByRole("button", { name: "Map", exact: true });
    const listButton = toolbar.getByRole("button", { name: "List", exact: true });
    await expect(mapButton).toHaveAttribute("aria-pressed", "true");

    await listButton.click();
    await expect(listButton).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".map-location-card")).toHaveCount(4);

    await mapButton.click();
    const search = page.getByRole("combobox", { name: "Find a portrait location" });
    await expect(search).toBeVisible();
    await search.fill("南京公");
    await expect(search).toHaveAttribute("aria-expanded", "true");
    await search.press("ArrowDown");
    await search.press("Enter");
    await expect(search).toHaveValue("南京公园");
    await expect(search).toHaveAttribute("aria-expanded", "false");

    await page.getByRole("button", { name: "Clear location search" }).click();
    await search.fill("No such location");
    await search.press("ArrowUp");
    await expect(page.getByRole("status")).toHaveText("No matching locations");
    await expect(search).not.toHaveAttribute("aria-activedescendant", /.+/);
    await expectNoHorizontalOverflow(page);
  });

  test("comparison mode, slider, and shortcut dialog keep entries and restore focus", async ({ page }) => {
    await page.addInitScript((entries) => {
      localStorage.setItem("nhb-compare-photos", JSON.stringify(entries));
    }, compareEntries);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/compare?lang=en");

    await expect(page.locator(".compare-page-card")).toHaveCount(2);
    const modes = page.getByRole("group", { name: "Comparison view mode" });
    const sideBySide = modes.getByRole("button", { name: "Side by side", exact: true });
    const overlay = modes.getByRole("button", { name: "Overlay", exact: true });
    await expect(sideBySide).toHaveAttribute("aria-pressed", "true");
    await overlay.click();
    await expect(overlay).toHaveAttribute("aria-pressed", "true");

    const slider = page.getByRole("slider");
    await expect(slider).toHaveAttribute("aria-valuenow", "50");
    await slider.press("ArrowLeft");
    await expect(slider).toHaveAttribute("aria-valuenow", "48");

    const shortcuts = page.getByRole("button", { name: "Keyboard Shortcuts" });
    await shortcuts.click();
    const dialog = page.getByRole("dialog", { name: "Keyboard Shortcuts" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close keyboard shortcuts" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(shortcuts).toBeFocused();
    await expect(page.locator(".compare-page-card, .compare-page-overlay")).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("nhb-compare-photos") || "[]").length)).toBe(2);
    await expectNoHorizontalOverflow(page);
  });

  test("mobile booking modal keeps calendar focus, active step, and global controls contained", async ({ page }) => {
    await page.route("**/api/booking/policy", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        earliestDate: "2099-08-20",
        timeZone: "Asia/Shanghai",
        capacityPerDay: 3,
        dateFormat: "YYYY-MM-DD",
        unavailableReasons: { beforeEarliest: "before_earliest", invalidDate: "invalid_date" },
        generatedAt: "2099-08-19T16:00:00.000Z",
      }),
    }));
    await page.route("**/api/availability**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ capacityPerDay: 3, dates: {} }),
    }));
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/booking?lang=en");
    await page.locator(".booking-quick-cta-btn").click();

    const dialog = page.getByRole("dialog").filter({ has: page.locator(".booking-modal-content") });
    const rail = dialog.locator(".booking-step-rail");
    await expect(dialog).toBeVisible();
    await expect(rail.locator("[aria-current='step'] strong")).toHaveText("Preferred Package");

    const august20 = dialog.getByRole("button", { name: /August 20, 2099 - Available/i });
    const august21 = dialog.getByRole("button", { name: /August 21, 2099 - Available/i });
    await august20.click();
    await august20.press("ArrowRight");
    await expect(august21).toBeFocused();
    await expect(august20).toHaveAttribute("aria-pressed", "true");

    await dialog.getByRole("button", { name: "Next", exact: true }).click();
    const activeStep = rail.locator("[aria-current='step']");
    await expect(activeStep.locator("strong")).toHaveText("Contact (WeChat/Phone)");
    const railMetrics = await rail.evaluate((element) => {
      const current = element.querySelector<HTMLElement>("[aria-current='step']")!;
      const label = current.querySelector<HTMLElement>("strong")!;
      const railBox = element.getBoundingClientRect();
      const currentBox = current.getBoundingClientRect();
      return {
        currentVisible: currentBox.left >= railBox.left - 1 && currentBox.right <= railBox.right + 1,
        labelClipped: label.scrollWidth > label.clientWidth || label.scrollHeight > label.clientHeight,
      };
    });
    expect(railMetrics).toEqual({ currentVisible: true, labelClipped: false });
    await expect(page.locator(".nhb-scroll-top")).toHaveCSS("visibility", "hidden");
    await expectNoHorizontalOverflow(page);
  });
});
