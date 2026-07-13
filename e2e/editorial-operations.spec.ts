import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const editorTestImage = resolve("public/images/gallery/gallery-urban-01.webp");

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
}

async function mockDashboard(page: Page) {
  await page.route("**/api/auth/session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      authenticated: true,
      user: { id: "user-1", email: "guest@example.com", displayName: "Guest Portrait Client" },
    }),
  }));
  await page.route("**/api/user/**", (route) => {
    const resource = new URL(route.request().url()).pathname.split("/").pop() || "items";
    const body = resource === "stats"
      ? {
          bookings: { total: 2, upcoming: 1 },
          courses: { total: 1 },
          workshops: { total: 1 },
        }
      : { [resource]: [] };
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

async function mockAdmin(page: Page) {
  await page.route("**/api/admin/session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ authenticated: true }),
  }));
  await page.route("**/api/admin/bookings", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ bookings: [] }),
  }));
  await page.route("**/api/admin/photos*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ photos: [] }),
  }));
  await page.route("**/api/admin/vitals?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ total: 0, days: 7, overall: [], daily: [], pages: [] }),
  }));
}

test.describe("editorial account and operations surfaces", () => {
  test.use({ serviceWorkers: "block" });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("nhb-pwa-install-dismissed-until", String(Date.now() + 86_400_000));
    });
  });

  test("dashboard command header and workspace remain readable at desktop and mobile widths", async ({ page }) => {
    await mockDashboard(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/dashboard?lang=en");

    await expect(page.locator(".dashboard-command-header")).toBeVisible();
    await expect(page.locator(".dashboard-account-meta")).toContainText("guest@example.com");
    const desktopPosition = await page.evaluate(() => ({
      headingTop: document.querySelector(".dashboard-command-copy h1")!.getBoundingClientRect().top,
      navigationBottom: document.querySelector(".site-nav")!.getBoundingClientRect().bottom,
      columns: getComputedStyle(document.querySelector(".dashboard-workspace")!).gridTemplateColumns,
    }));
    expect(desktopPosition.headingTop).toBeGreaterThan(desktopPosition.navigationBottom);
    expect(desktopPosition.columns).not.toBe("none");

    const bookings = page.getByRole("tab", { name: "My Bookings", exact: true });
    await bookings.focus();
    await bookings.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "My Photos", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".dashboard-workspace-panel-head")).toContainText("My Photos");

    await page.setViewportSize({ width: 375, height: 812 });
    const shortcutMetrics = await page.locator(".dashboard-profile-shortcut span").evaluateAll((labels) =>
      labels.map((label) => ({
        horizontalClip: label.scrollWidth > label.clientWidth + 1,
        verticalClip: label.scrollHeight > label.clientHeight + 1,
      })),
    );
    expect(shortcutMetrics).toHaveLength(3);
    expect(shortcutMetrics).toEqual(shortcutMetrics.map(() => ({ horizontalClip: false, verticalClip: false })));
    await expect(page.locator(".dashboard-workspace-tablist")).toHaveCSS("flex-direction", "row");
    await expectNoHorizontalOverflow(page);
  });

  test("editor keeps mobile controls visible and restores focus after export", async ({ page }) => {
    await page.route("**/models/**", (route) => route.abort("failed"));
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/editor?lang=en");
    await page.locator('input[type="file"]').setInputFiles(editorTestImage);
    await expect(page.locator(".editor-canvas")).toBeVisible({ timeout: 15_000 });

    const workflowMetrics = await page.locator(".editor-workflow-tabs").evaluate((tabs) => {
      const bounds = tabs.getBoundingClientRect();
      return [...tabs.querySelectorAll<HTMLElement>(".editor-workflow-tab")].map((tab) => {
        const box = tab.getBoundingClientRect();
        return {
          contained: box.left >= bounds.left - 1 && box.right <= bounds.right + 1,
          clipped: tab.scrollWidth > tab.clientWidth + 1 || tab.scrollHeight > tab.clientHeight + 1,
        };
      });
    });
    expect(workflowMetrics).toHaveLength(4);
    expect(workflowMetrics).toEqual(workflowMetrics.map(() => ({ contained: true, clipped: false })));

    await page.evaluate(() => window.scrollTo(0, 220));
    const stickyPosition = await page.evaluate(() => ({
      toolbarTop: document.querySelector(".editor-toolbar")!.getBoundingClientRect().top,
      navigationBottom: document.querySelector(".site-nav")!.getBoundingClientRect().bottom,
    }));
    expect(stickyPosition.toolbarTop).toBeGreaterThanOrEqual(stickyPosition.navigationBottom);

    await page.locator('.editor-toolbar button[aria-label="Compare"]').click();
    const slider = page.getByRole("slider", { name: "Comparison divider" });
    await expect(slider).toHaveAttribute("aria-valuenow", "50");
    await slider.press("ArrowRight");
    await expect(slider).toHaveAttribute("aria-valuenow", "52");

    const exportButton = page.locator('.editor-toolbar button[aria-label="Export"]');
    await exportButton.click();
    const dialog = page.locator(".editor-modal");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".editor-modal-close")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(exportButton).toBeFocused();
    await expectNoHorizontalOverflow(page);
  });

  test("admin exposes every operations section in a responsive navigation rail", async ({ page }) => {
    await mockAdmin(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/admin?lang=en");

    await expect(page.locator(".adm-bar-kicker")).toHaveText("PUBLICATION DESK / OPERATIONS");
    const desktopLayout = await page.locator(".adm-shell").evaluate((shell) => ({
      display: getComputedStyle(shell).display,
      columns: getComputedStyle(shell).gridTemplateColumns.split(" ").filter(Boolean).length,
    }));
    expect(desktopLayout).toEqual({ display: "grid", columns: 2 });

    await page.setViewportSize({ width: 375, height: 812 });
    const vitals = page.getByRole("button", { name: "Web Vitals", exact: true });
    await vitals.click();
    await expect(vitals).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".adm-workspace")).toContainText("No real-user data yet");
    const mobileNavigation = await page.locator(".adm-tabs").evaluate((tabs) => {
      const active = tabs.querySelector<HTMLElement>("button.is-active")!;
      const bounds = tabs.getBoundingClientRect();
      const activeBounds = active.getBoundingClientRect();
      return {
        direction: getComputedStyle(tabs).flexDirection,
        scrollable: tabs.scrollWidth > tabs.clientWidth,
        activeVisible: activeBounds.left >= bounds.left - 1 && activeBounds.right <= bounds.right + 1,
      };
    });
    expect(mobileNavigation).toEqual({ direction: "row", scrollable: true, activeVisible: true });
    await expectNoHorizontalOverflow(page);
  });

  test("direct 404 visits load the editorial boundary styles without clipping actions", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/missing-editorial-frame?lang=en");

    await expect(page.getByRole("heading", { name: "Page Not Found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to Home", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Gallery", exact: true }).first()).toBeVisible();
    const boundaryMetrics = await page.locator(".not-found").evaluate((boundary) => ({
      headingSize: Number.parseFloat(getComputedStyle(boundary.querySelector("h1")!).fontSize),
      actionsDisplay: getComputedStyle(boundary.querySelector(".not-found-actions")!).display,
      clippedActions: [...boundary.querySelectorAll<HTMLElement>(".not-found-action")].some(
        (action) => action.scrollWidth > action.clientWidth + 1 || action.scrollHeight > action.clientHeight + 1,
      ),
    }));
    expect(boundaryMetrics.headingSize).toBeLessThanOrEqual(48);
    expect(boundaryMetrics.actionsDisplay).toBe("grid");
    expect(boundaryMetrics.clippedActions).toBe(false);
    await expectNoHorizontalOverflow(page);
  });
});
