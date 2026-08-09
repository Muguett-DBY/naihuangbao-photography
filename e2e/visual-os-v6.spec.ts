import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("lang", "zh-CN");
    localStorage.setItem("nhb-motion-mode", "full");
  });
});

test("@critical 首页真实客片可切换并进入完整作品集", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const hero = page.locator(".home-booking-hero");
  const heroImage = hero.locator(".home-booking-hero__media img");
  const workButtons = hero.getByRole("group", { name: "作品集" }).getByRole("button");
  await expect(workButtons).toHaveCount(3);
  const initialSource = await heroImage.evaluate((image) => (image as HTMLImageElement).currentSrc);
  await workButtons.last().click();
  await expect(workButtons.last()).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => heroImage.evaluate((image) => (image as HTMLImageElement).currentSrc)).not.toBe(initialSource);

  const galleryLink = hero.locator('.home-booking-secondary[href="/gallery"]');
  await galleryLink.focus();
  await galleryLink.press("Enter");
  await expect(page).toHaveURL(/\/gallery$/);
  await expect(page.locator(".gallery-page-contact-sheet")).toBeVisible();
});

test("@critical V6 档案相似度模式、本地展览和深链保持一致", async ({ page }) => {
  await page.goto("/archive?similar=visual-os-v8-13-coral-pigment-press");

  const discovery = page.locator(".archive-discovery");
  await expect(discovery.locator(".archive-discovery__neighbors article")).toHaveCount(6);
  await discovery.getByRole("group", { name: "相似画面计算方式" }).getByRole("button", { name: "颜色邻近" }).click();
  await expect(discovery.getByRole("button", { name: "颜色邻近" })).toHaveAttribute("aria-pressed", "true");

  await discovery.locator(".archive-discovery__reference").getByRole("button", { name: "加入展览" }).click();
  await expect(page.locator(".archive-exhibition h3")).toHaveText("我的临时展览 · 1");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("nhb-archive-exhibition-v1"))).toContain("visual-os-v8-13-coral-pigment-press");

  const neighbor = discovery.locator(".archive-discovery__neighbor-image").first();
  await neighbor.click();
  await expect(page).not.toHaveURL(/similar=visual-os-v8-13-coral-pigment-press$/);
  await expect(discovery.locator(".archive-discovery__reference")).not.toHaveAttribute("data-reference-asset", "visual-os-v8-13-coral-pigment-press");
});

test("@critical V6 Studio 配方、图层、OPFS 状态与分支快照可用", async ({ page }) => {
  await page.goto("/create");
  await page.evaluate(() => new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase("nhb-local-studio");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  }));
  await page.reload();

  await expect(page.locator(".studio-recipe-rail button")).toHaveCount(4);
  await page.getByRole("button", { name: /MOSS INDEX/ }).click();
  await expect(page.locator(".studio-canvas-frame")).toHaveClass(/studio-canvas-frame--contact-sheet/);
  await expect(page.locator(".studio-layer-controls select")).toHaveValue("multiply");
  await expect(page.locator(".studio-layer-controls input[type=range]")).toHaveValue("0.92");
  await page.getByRole("button", { name: "隐藏当前图层" }).click();
  await expect(page.getByRole("button", { name: "显示当前图层" })).toBeVisible();
  await expect(page.locator(".studio-storage-status")).toContainText(/OPFS PROJECT FILES|INDEXEDDB PROJECTS/);

  const shelf = page.locator(".studio-project-shelf");
  await shelf.getByRole("button", { name: "SNAPSHOT" }).click();
  await shelf.getByRole("button", { name: "SNAPSHOT" }).click();
  await expect(page.locator(".studio-project-shelf__versions button")).toHaveCount(2);
  await expect(page.locator(".studio-project-shelf__versions")).toContainText("MAIN");
  await expect(page.locator(".studio-project-shelf__versions")).toContainText("BRANCH-1");
});

test("@critical V6 Story Builder 双设备、九布局和档案展览导入可用", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nhb-archive-exhibition-v1", JSON.stringify([
      "visual-os-v6-03-coral-chamber",
      "visual-os-v6-07-night-glass-garden",
    ]));
  });
  await page.goto("/create/story");

  await expect(page.locator(".story-timeline")).toBeVisible();
  await expect(page.locator(".story-builder-layouts button")).toHaveCount(9);
  await page.getByRole("group", { name: "Preview size" }).getByRole("button", { name: "MOBILE" }).click();
  await expect(page.locator(".story-builder-preview")).toHaveClass(/story-builder-preview--mobile/);
  await page.getByRole("group", { name: "Chapter layout" }).getByRole("button", { name: "Constellation" }).click();
  await expect(page.locator(".story-builder-preview__chapter.is-active")).toHaveClass(/story-builder-preview__chapter--constellation/);

  const chapterCount = await page.locator(".story-timeline [role=listitem]").count();
  await page.getByTitle("Import archive exhibition").click();
  await expect(page.locator(".story-builder-topbar")).toContainText("2 ARCHIVE FRAMES IMPORTED");
  await expect(page.locator(".story-timeline [role=listitem]")).toHaveCount(chapterCount + 1);
  await expect(page.locator(".story-builder-preview__chapter.is-active")).toContainText("展览线索 1");
});

test("@critical V6 路由契约、内容清单与静态详情页可直接访问", async ({ request }) => {
  const routesResponse = await request.get("/route-contract.json");
  expect(routesResponse.ok()).toBe(true);
  const routes = await routesResponse.json();
  expect(routes.schemaVersion).toBe(1);
  expect(routes.routes).toHaveLength(33);

  const assetsResponse = await request.get("/visual-asset-manifest.json");
  expect(assetsResponse.ok()).toBe(true);
  const assets = await assetsResponse.json();
  expect(assets.schemaVersion).toBe(2);
  expect(assets.assets).toHaveLength(94);

  const projectResponse = await request.get("/archive/coral-afterglow-room/");
  expect(projectResponse.ok()).toBe(true);
  const projectHtml = await projectResponse.text();
  expect(projectHtml).toContain("Coral Afterglow Room");
  expect(projectHtml).toContain('rel="canonical" href="https://shoot.custard.top/archive/coral-afterglow-room"');
  expect(projectHtml).toContain('application/ld+json');
});
